import "module-alias/register";
import { startWingman, updateServerStatus } from "./wingman.local";
import { default as logger } from "@/utils/logger.winston";

const SERVER_NAME = "wingmanServer";

export const stop = async (): Promise<void> =>
{
    logger.debug(`${SERVER_NAME}: exit requested.`);
    await updateServerStatus("stopped");
};

export const main = async (): Promise<void> =>
{
    logger.info(`${SERVER_NAME}: Wingman server started.`);
    try {
        await startWingman("default");
    } catch (err) {
        logger.error(`${SERVER_NAME}: (main) Exception (startWingman): ${err}`);
    } finally {
        logger.info(`${SERVER_NAME}: Wingman default complete.`);
    }
};
