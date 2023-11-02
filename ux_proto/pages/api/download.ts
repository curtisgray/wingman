import { NextApiRequest, NextApiResponse } from "next";
// import { newDownloadItem, getDownloadItem, updateDownloadItem, deleteDownloadItem } from "@/utils/server/orm.Sqlite";
import { default as orm } from "@/utils/server/orm";
import { default as logger } from "@/utils/logger.winston";
// import { deleteDownloadItemFile } from "@/utils/server/fs.download";

const SERVER_NAME = "download_handler";

/**
 * query params:
 * - modelRepo: string
 * - filePath: string
 * - cancel: string
 * - reset: string
 * - info: DownloadedFile
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse)
{
    logger.debug(`${SERVER_NAME}: request from ${req.headers["x-forwarded-for"]?.toString || req.socket.remoteAddress} for ${req.url}`);
    const modelRepo = req.query.modelRepo as string;
    const filePath = req.query.filePath as string;
    const cancel = req.query.cancel as string | undefined;
    const reset = req.query.reset as string | undefined;
    const info = req.query.item as string | undefined;

    if (modelRepo === undefined || filePath === undefined) {
        logger.error(`${SERVER_NAME}: (handler) modelRepo and filePath are required`);
        return res.status(400).json({ status: "error", progress: 0, error: "modelRepo and filePath are required" });
    }

    if (!orm.isInitialized()) {
        logger.debug(`${SERVER_NAME}: Initializing database...`);
        try {
            // Initialize database
            await orm.initialize();
        }
        catch (err) {
            logger.error(`${SERVER_NAME}: Error initializing database: ${err}`);
            throw err;
        }
    }

    const enqueueDownload = async () =>
    {
        logger.silly(`${SERVER_NAME}: (handler.enqueueDownload)...`);

        await orm.insertNewDownloadItem(modelRepo, filePath);

        const progress = await orm.getDownloadItem(modelRepo, filePath);

        if (!progress) {
            logger.error(`${SERVER_NAME}: (handler.enqueueDownload) Failed to get progress`);
            return res.status(500).json({ status: "error", progress: 0, error: "Failed to get progress" });
        }

        progress.status = "queued";
        await orm.updateDownloadItem(progress);

        logger.debug(`${SERVER_NAME}: (handler.enqueueDownload) ${JSON.stringify(progress)}`);
        logger.http(`${SERVER_NAME}: 201 - Created (${modelRepo}, ${filePath})`);
        return res.status(201).json(progress);
    };

    const cancelDownload = async () =>
    {
        logger.silly(`${SERVER_NAME}: (handler.cancelDownload)...`);
        const item = await orm.getDownloadItem(modelRepo, filePath);
        if (!item) {
            logger.error(`${SERVER_NAME}: (handler.cancelDownload) data does not exist`);
            return res.status(404).end();
        }
        item.status = "cancelled";
        item.progress = 0;
        item.updated = Date.now();
        item.created = Date.now();
        await orm.updateDownloadItem(item);
        logger.http(`${SERVER_NAME}: 200 - Cancelled (${modelRepo}, ${filePath})`);
        return res.status(200).json(item);
    };

    const resetDownload = async () =>
    {
        logger.silly(`${SERVER_NAME}: (handler.resetDownload)...`);
        const item = await orm.getDownloadItem(modelRepo, filePath);
        if (!item) {
            logger.error(`${SERVER_NAME}: (handler.resetDownload) data does not exist`);
            return res.status(404).end();
        }
        await orm.deleteDownloadItem(modelRepo, filePath);  // file will be deleted automatically by download service
        // await deleteDownloadItemFile(modelRepo, filePath);
        logger.http(`${SERVER_NAME}: 205 - Reset (${modelRepo}, ${filePath})`);
        return res.status(205).end();
    };

    const sendDownloadFileInfo = async () =>
    {
        // first check if the item exists in the db, if not check if the file exists, if not return 404
        logger.silly(`${SERVER_NAME}: (handler.getDownloadedFile)...`);
        const downloadedFile = await orm.getDownloadedFileInfo(modelRepo, filePath);

        if (!downloadedFile) {
            logger.error(`${SERVER_NAME}: (handler.getDownloadedFile) data does not exist`);
            return res.status(404).end();
        } else {
            logger.http(`${SERVER_NAME}: (handler.getDownloadedFile) 200 - Found (${modelRepo}, ${filePath})`);
            logger.silly(`${SERVER_NAME}: (handler.getDownloadedFile) ${JSON.stringify(downloadedFile)}`);
            return res.status(200).json(downloadedFile);
        }
    };

    if (cancel !== undefined) {
        return cancelDownload();
    }
    else if (reset !== undefined) {
        return resetDownload();
    }
    else if (info !== undefined) {
        return sendDownloadFileInfo();
    }
    else {
        const item = await orm.getDownloadItem(modelRepo, filePath).catch(() => null);
        logger.silly(`${SERVER_NAME}: ${JSON.stringify(item)}`);
        if (item) {
            switch (item.status) {
                case "idle":
                case "cancelled":
                case "error":
                    // If the download is cancelled or errored, reset it and enqueue the download
                    return resetDownload();
                default:
                    // If the download is already completed, queued or in-progress, inform the client
                    logger.http(`${SERVER_NAME}: 208 - Already reported (${modelRepo}, ${filePath})`);
                    return res.status(208).json(item);
            }
        } else {
            // If the progress tracker file does not exist, create it and enqueue the download
            logger.http(`${SERVER_NAME}: 201 - Created (${modelRepo}, ${filePath})`);
            return enqueueDownload();
        }
    }
}
