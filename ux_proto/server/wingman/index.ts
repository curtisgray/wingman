import "module-alias/register";
import { initializeServerStatus, startWingman, updateServerStatus } from "./wingman.local";
import { default as logger } from "@/utils/logger.winston";
// import { getNextWingmanItem, initializeOrm, updateWingmanItem } from "@/utils/server/orm.Sqlite";
import { default as orm } from "@/utils/server/orm";
import { WingmanItem } from "@/types/wingman";
import path from "path";
import { MODELS_DIR, safeDownloadItemName } from "@/types/download";

const SERVER_NAME = "wingmanServer";
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
    logger.info(`${SERVER_NAME}: Wingman server started.`);
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
        logger.silly(`${SERVER_NAME}: Checking for queued inference...`);
        const item = await orm.getNextWingmanItem();
        logger.silly(`${SERVER_NAME}: (main) item: ${JSON.stringify(item)}`);
        if (item) {
            const currentItem = item as WingmanItem;
            logger.debug(`${SERVER_NAME}: (main) currentItem: ${JSON.stringify(currentItem)}`);

            logger.info(`${SERVER_NAME}: Processing inference of ${currentItem.filePath}...`);

            if (currentItem !== undefined) {
                currentItem.status = "inferring";
                await orm.updateWingmanItem(currentItem);
                await updateServerStatus("preparing", currentItem);

                logger.debug(`${SERVER_NAME}: (main) calling startWingman ${currentItem.alias}...`);
                try {
                    const modelFilePath = path.join(MODELS_DIR, safeDownloadItemName(currentItem.modelRepo, currentItem.filePath));
                    logger.debug(`${SERVER_NAME}: (main) modelFilePath: ${modelFilePath}`);
                    await startWingman(modelFilePath, currentItem.alias);
                } catch (err) {
                    logger.error(`${SERVER_NAME}: (main) Exception (startWingman): ${err}`);
                    await updateServerStatus("error", currentItem, err?.toString());
                } finally {
                    logger.info(`${SERVER_NAME}: Wingman of ${currentItem.alias} complete.`);
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
//     logger.info(`${SERVER_NAME}: Wingman server exiting.`);
//     await updateServerStatus("stopped");
//     process.exit(0);
// }).catch(async err =>
// {
//     logger.error(`${SERVER_NAME}: Exception (main): ${err}`);
//     await updateServerStatus("error", undefined, err?.toString());
//     process.exit(1);
// });

