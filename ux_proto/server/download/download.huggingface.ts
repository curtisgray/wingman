import * as fs from "fs";
import { https } from "follow-redirects";
import { default as logger } from "@/utils/logger.winston";

import { StartDownloadProps, createDownloadItem, DownloadItem, DownloadServer, DownloadServerStatus, MODELS_DIR, getDownloadItemFilePath } from "@/types/download";
import { default as orm } from "@/utils/server/orm";
import byteSize from "byte-size";
import { deleteDownloadItemFile, downloadItemFileExists } from "@/utils/server/fs.download";

const SERVER_NAME = "huggingfaceDownload";
logger.debug(`${SERVER_NAME}: MODELS_DIR: ${MODELS_DIR}`);

fs.promises.mkdir(MODELS_DIR).catch(() => { });  // Ignore error if directory already exists

// Utility function to get the url for a specific modelRepo and filePath
export const getURL = (modelRepo: string, filePath: string): string =>
    // Prototype: https://huggingface.co/TheBloke/CodeLlama-7B-GGUF/resolve/main/codellama-7b.Q2_K.gguf
    // Template: https://huggingface.co/{modelRepo}/resolve/main/{filePath}
    `https://huggingface.co/${modelRepo}/resolve/main/${filePath}`;

const calculateDownloadSpeed = (item: DownloadItem | undefined, itemCache: DownloadItem | undefined): string =>
{
    // calculate bytes per second from cache and data
    if (
        !itemCache ||
        ((itemCache?.downloadedBytes) == null) ||
        ((itemCache?.totalBytes) == null) ||
        !item ||
        ((item?.downloadedBytes) == null) ||
        ((item?.totalBytes) == null)
    )
        return "\u{00B7}\u{00B7}\u{00B7}";
    let timeDiff = item.updated - itemCache.updated;
    if (timeDiff <= 0) timeDiff = 1;
    const bytesDiff = item.downloadedBytes - itemCache.downloadedBytes ?? 0;
    const speed = (bytesDiff / timeDiff) * 1000;
    const speedString = `${byteSize(speed, { precision: 1 })}/s`;
    return (speed > 0) ? speedString : "";
};

const isCancelled = async (modelRepo: string, filePath: string): Promise<boolean> =>
{
    const item = await orm.getDownloadItem(modelRepo, filePath);
    if (item?.status === "cancelled") {
        return true;
    }
    return false;
};

export const initializeServerStatus = async (): Promise<void> =>
{
    const appItemValue = await orm.getAppItemValue(SERVER_NAME, "default");
    if (appItemValue === undefined) {
        await orm.newAppItem(SERVER_NAME);
        const data: DownloadServer = {
            isa: "DownloadServer",
            status: "starting",
            created: Date.now(),
            updated: Date.now()
        };
        await orm.setAppItemValue(SERVER_NAME, "default", JSON.stringify(data));
    }
    // Check for orphaned downloads and clean up
    const downloads = await orm.getDownloadItems();
    // if any downloads are completed, but not exist in the file system, delete them
    for (const download of downloads) {
        if (download.status === "complete") {
            if (!await downloadItemFileExists(download.modelRepo, download.filePath)) {
                await deleteDownloadItemFile(download.modelRepo, download.filePath);
                await orm.deleteDownloadItem(download.modelRepo, download.filePath);
            }
        }
    }
    await orm.resetDownloads();
    // TODO: remove any download files from the models directory that are not in the database
};

export const updateServerStatus = async (status: DownloadServerStatus, downloadItem?: DownloadItem, error?: string): Promise<void> =>
{
    const appItemValue = await orm.getAppItemValue(SERVER_NAME, "default");
    if (appItemValue !== undefined) {
        const appData = JSON.parse(appItemValue) as DownloadServer;
        appData.status = status;
        if (error !== undefined) {
            appData.error = error;
        } else {
            delete appData.error;
        }
        if (downloadItem) {
            appData.currentDownload = downloadItem;
        } else if (status === "ready") {
            delete appData.currentDownload;
        }
        appData.updated = Date.now();
        await orm.setAppItemValue(SERVER_NAME, "default", JSON.stringify(appData));
    }
};

export const startDownload = async (modelRepo: string, filePath: string, overwrite: boolean): Promise<StartDownloadProps> =>
{
    logger.debug(`${SERVER_NAME}: (startDownload) modelRepo: ${modelRepo}, filePath: ${filePath}, overwrite: ${overwrite}`);
    const url = getURL(modelRepo, filePath);
    // const destination = path.join(MODELS_DIR, safeDownloadItemName(modelRepo, filePath));
    const destination = getDownloadItemFilePath(modelRepo, filePath);
    const returnProps: StartDownloadProps = { modelRepo: modelRepo, filePath: filePath, destination: destination };
    // const signal = controller.signal;

    return new Promise((resolve, reject) =>
    {
        logger.debug(`${SERVER_NAME}: (startDownload) url: ${url}`);
        // Check file does not exist yet before hitting network
        fs.access(destination, fs.constants.F_OK, (err) =>
        {
            if (!overwrite && err === null) reject(new Error("File already exists"));
            logger.info(`${SERVER_NAME}: (startDownload) destination: ${destination}`);

            const request = https.get(url, async response =>
            {
                if (response.statusCode === 200) {
                    logger.debug(`${SERVER_NAME}: (startDownload) response.statusCode: ${response.statusCode}`);
                    const totalBytes = parseInt(response.headers["content-length"] ?? "0", 10);
                    const progressData = createDownloadItem(modelRepo, filePath);
                    let itemCache: DownloadItem | undefined = undefined;
                    let downloadedBytes = 0;
                    const file = fs.createWriteStream(destination, { flags: "w" });

                    logger.debug(`${SERVER_NAME}: (startDownload) file: ${file}`);

                    file.on("finish", async () =>
                    {
                        logger.debug(`${SERVER_NAME}: (startDownload) ${modelRepo}/${filePath}`);
                        progressData.status = "complete";
                        progressData.progress = 100;
                        await orm.updateDownloadItem(progressData);
                        await updateServerStatus("ready");
                        resolve(returnProps);
                    });

                    file.on("error", async err =>
                    {
                        const errorString = `${SERVER_NAME}: file.on('error'): ${err}`;
                        logger.error(`${SERVER_NAME}: file.on('error'): ${err}`);
                        file.close();
                        progressData.status = "error";
                        progressData.error = err.message;
                        await orm.updateDownloadItem(progressData);
                        await updateServerStatus("error", progressData, err.message);
                        reject(new Error(errorString));
                    });

                    response.on("error", async err =>
                    {
                        if (err.message === "aborted") {
                            progressData.status = "cancelled";
                            progressData.error = err.message;
                        } else {
                            progressData.status = "error";
                            progressData.error = err.message;
                        }
                        await orm.updateDownloadItem(progressData);
                        await updateServerStatus("error", progressData, err.message);
                        logger.error(`${SERVER_NAME}: response.on('error'): ${err}`);
                    });

                    const downloadingUpdateInterval = 1000; // interval in ms to update progress
                    let dataEventTime = Date.now(); // Time of last 'data' event

                    response.on("data", async chunk =>
                    {
                        downloadedBytes += chunk.length;
                        const progress = (downloadedBytes / totalBytes) * 100;
                        progressData.status = "downloading";
                        progressData.totalBytes = totalBytes;
                        progressData.downloadedBytes = downloadedBytes;
                        progressData.progress = progress;
                        progressData.downloadSpeed = calculateDownloadSpeed(progressData, itemCache);
                        itemCache = structuredClone(progressData);

                        const timeDiff = Date.now() - dataEventTime; // Calculate the time difference
                        if (timeDiff > downloadingUpdateInterval) {
                            if (await isCancelled(modelRepo, filePath)) {
                                // request.abort();

                                await updateServerStatus("ready");
                                reject(new Error("Download cancelled"));
                            } else {
                                // If the time difference is greater than 1 second, reset the counter and time
                                dataEventTime = Date.now();
                                logger.debug(`${SERVER_NAME}: (startDownload) dataEventCount: ${timeDiff}ms, downloadingUpdateInterval: ${downloadingUpdateInterval}ms`);
                                // Update progress
                                await orm.updateDownloadItem(progressData);
                                await updateServerStatus("downloading", progressData);
                            }
                        }
                    });

                    // manage backpressure
                    logger.debug(`${SERVER_NAME}: (startDownload) response.pipe(file)`);
                    await updateServerStatus("downloading", progressData);
                    response.pipe(file);
                } else if ((response.statusCode === 302 || response.statusCode === 301) && response.headers.location !== undefined) {
                    // follow redirect was supposed to do this... this is an error
                    throw new Error("Redirects should be followed automatically");
                } else {
                    const errorString = `${SERVER_NAME}: (startDownload) response.statusCode: ${response.statusCode}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
            });

            request.on("error", async err =>
            {
                const errorString = `${SERVER_NAME}: request.on('error'): ${err}`;
                logger.error(errorString);
                await updateServerStatus("error", undefined, err.message);
                reject(new Error(errorString));
            });

            request.on("abort", async () =>
            {
                const errorString = `${SERVER_NAME}: request.on('abort')`;
                logger.info(errorString);
                await updateServerStatus("ready", undefined, "Download aborted");
                reject(new Error("Download aborted"));
            });
        });
    });
};
