import "module-alias/register";
import { initializeServerStatus, startDownload, updateServerStatus } from "./download.huggingface";
import { DownloadItem } from "@/types/download";
import { default as logger } from "@/utils/logger.winston";
// import { getNextDownloadItem, initializeOrm, updateDownloadItem } from "@/utils/server/orm.Sqlite";
import { default as orm } from "@/utils/server/orm";

const SERVER_NAME = "downloadServer";
const QUEUE_CHECK_INTERVAL = 5000;  // Check every x milliseconds

let __isRunning = true;
let __stopped = false;

// process.on("SIGINT", async function ()
// {
//     logger.debug(`${SERVER_NAME}: exit requested.`);
//     __isRunning = false;
//     await updateServerStatus("stopped");

//     process.exit(0);
// });
export const stop = async (): Promise<void> =>
{
    logger.debug(`${SERVER_NAME}: exit requested.`);
    __isRunning = false;
    while (!__stopped) {
        logger.debug(`${SERVER_NAME}: Waiting for server to stop...`);
        await new Promise(resolve => setTimeout(resolve, QUEUE_CHECK_INTERVAL));
    }
    await updateServerStatus("stopped");
};

export const main = async (): Promise<void> =>
{
    logger.info(`${SERVER_NAME}: Download server started.`);
    // try {
    //     // Initialize database
    //     await orm.initialize();
    // }
    // catch (err) {
    //     logger.error(`${SERVER_NAME}: Error initializing database: ${err}`);
    //     throw err;
    // }

    await initializeServerStatus();

    while (__isRunning) {
        updateServerStatus("ready");
        logger.silly(`${SERVER_NAME}: Checking for queued downloads...`);
        const nextProgress = await orm.getNextDownloadItem();
        logger.silly(`${SERVER_NAME}: (main) nextProgress: ${JSON.stringify(nextProgress)}`);
        if (nextProgress) {
            const currentItem = nextProgress as DownloadItem;
            logger.debug(`${SERVER_NAME}: (main) currentItem: ${JSON.stringify(currentItem)}`);
            const modelName = `${currentItem.modelRepo}/${currentItem.filePath}`;

            logger.info(`${SERVER_NAME}: Processing download of ${modelName}...`);

            if (currentItem !== undefined) {
                currentItem.status = "downloading";
                await orm.updateDownloadItem(currentItem);
                await updateServerStatus("preparing", currentItem);

                logger.debug(`${SERVER_NAME}: (main) calling startDownload ${modelName}...`);
                try {
                    await startDownload(currentItem.modelRepo, currentItem.filePath, true);
                } catch (err) {
                    logger.error(`${SERVER_NAME}: (main) Exception (startDownload): ${err}`);
                    await updateServerStatus("error", currentItem, err?.toString());
                } finally {
                    logger.info(`${SERVER_NAME}: Download of ${modelName} complete.`);
                    await updateServerStatus("ready");
                }
            }
        }
        logger.silly(`${SERVER_NAME}: Waiting ${QUEUE_CHECK_INTERVAL}ms...`);
        await new Promise(resolve => setTimeout(resolve, QUEUE_CHECK_INTERVAL));
    }
    await updateServerStatus("stopping");
    __stopped = true;
};

// export default main;

// main().then(async () =>
// {
//     logger.info(`${SERVER_NAME}: Download server exiting.`);
//     await updateServerStatus("stopped");
//     process.exit(0);
// }).catch(async err =>
// {
//     logger.error(`${SERVER_NAME}: Exception (main): ${err}`);
//     await updateServerStatus("error", undefined, err?.toString());
//     process.exit(1);
// });

