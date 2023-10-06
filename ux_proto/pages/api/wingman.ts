import { NextApiRequest, NextApiResponse } from "next";
import { default as logger } from "@/utils/logger.winston";
// import { getWingmanItem, newWingmanItem, updateWingmanItem } from "@/utils/server/orm.Sqlite";
import { default as orm } from "@/utils/server/orm";

const SERVER_NAME = "wingman_local";

/**
 * commands:
 * start: start a new wingman item
 *    required query parameters:
 *      alias: "default" | string
 *      modelRepo: string
 *      filePath: string
 * stop: stop a wingman item
 *    required query parameters:
 *      alias: "default" | string
 * restart: stop and start a wingman item
 *    required query parameters:
 *      alias: "default" | string
 * status: get the status of a wingman item
 *    required query parameters:
 *      alias: "default" | string
 **/
export default async function handler(req: NextApiRequest, res: NextApiResponse)
{
    logger.debug(`${SERVER_NAME}: request from ${req.headers["x-forwarded-for"]?.toString ?? req.socket.remoteAddress} for ${req.url}`);

    // Required query parameters
    // command: "start" | "stop" | "restart" | "status"
    // Optional query parameters
    // alias: "default" | string
    const start = req.query.start as string | undefined;
    const stop = req.query.stop as string | undefined;
    const restart = req.query.restart as string | undefined;
    const status = req.query.status as string | undefined;
    const alias = req.query.alias as string | undefined;
    const modelRepo = req.query.modelRepo as string | undefined;
    const filePath = req.query.filePath as string | undefined;

    if (alias === undefined) {
        logger.error(`${SERVER_NAME}: (handler) alias is required`);
        return res.status(400).json({ status: "error", error: "alias is required" });
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

    const enqueueWingmanStart = async (alias: string, modelRepo:string, filePath: string, force: boolean = false) =>
    {
        logger.silly(`${SERVER_NAME}: (handler.enqueueWingman)...`);

        await orm.insertNewWingmanItem(alias, modelRepo, filePath, force);

        const item = await orm.getWingmanItem(alias);

        if (!item) {
            logger.error(`${SERVER_NAME}: (handler.enqueueWingman) Failed to get progress`);
            return res.status(500).json({ status: "error", progress: 0, error: "Failed to get progress" });
        }

        item.status = "queued";
        await orm.updateWingmanItem(item);

        // logger.debug(`${SERVER_NAME}: (handler.enqueueWingman) ${JSON.stringify(item)}`);
        logger.http(`${SERVER_NAME}: 201 - Created (${alias}/${modelRepo}/${filePath})`);
        return res.status(201).json(item);
    };

    const stopWingman = async () =>
    {
        logger.silly(`${SERVER_NAME}: (handler.stopWingman)...`);
        if (alias === undefined) {
            logger.error(`${SERVER_NAME}: (handler) alias is required`);
            return res.status(400).json({ status: "error", error: "alias is required" });
        }
        // get the wingman item and set status to "stopped"
        const item = await orm.getWingmanItem(alias);
        if (!item) {
            logger.error(`${SERVER_NAME}: (handler.stopWingman) data does not exist`);
            return res.status(404).end();
        }
        item.status = "cancelling";
        await orm.updateWingmanItem(item);
    };

    const restartWingman = async () =>
    {
        logger.silly(`${SERVER_NAME}: (handler.restartWingman)...`);
        if (alias === undefined) {
            logger.error(`${SERVER_NAME}: (handler) alias is required`);
            return res.status(400).json({ status: "error", error: "alias is required" });
        }
        // get the wingman item and set status to "stopped"
        const item = await orm.getWingmanItem(alias);
        if (!item) {
            logger.error(`${SERVER_NAME}: (handler.restartWingman) data does not exist`);
            return res.status(404).end();
        }
        item.status = "cancelling";
        await orm.updateWingmanItem(item);
        // wait for the wingman item to be cancelled
        while (item.status === "cancelling") {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // enqueue the wingman item
        await enqueueWingmanStart(alias, item.modelRepo, item.filePath);
    };

    const getWingmanStatus = async () =>
    {
        logger.silly(`${SERVER_NAME}: (handler.getWingmanStatus)...`);
        if (alias === undefined) {
            logger.error(`${SERVER_NAME}: (handler) alias is required`);
            return res.status(400).json({ status: "error", error: "alias is required" });
        }
        const item = await orm.getWingmanItem(alias);
        if (!item) {
            logger.error(`${SERVER_NAME}: (handler.getWingmanStatus) data does not exist`);
            return res.status(404).end();
        }
        logger.debug(`${SERVER_NAME}: (handler.getWingmanStatus) ${JSON.stringify(item)}`);
        return res.status(200).json(item);
    };

    if (start !== undefined) {
        if (alias === undefined) {
            logger.error(`${SERVER_NAME}: (handler) alias is required`);
            return res.status(400).json({ status: "error", error: "alias is required" });
        }
        if (modelRepo === undefined) {
            logger.error(`${SERVER_NAME}: (handler) modelRepo is required`);
            return res.status(400).json({ status: "error", error: "modelRepo is required" });
        }
        if (filePath === undefined) {
            logger.error(`${SERVER_NAME}: (handler) filePath is required`);
            return res.status(400).json({ status: "error", error: "filePath is required" });
        }
        return enqueueWingmanStart(alias, modelRepo, filePath);
    }

    if (stop !== undefined) {
        return stopWingman();
    }

    if (restart !== undefined) {
        return restartWingman();
    }

    if (status !== undefined) {
        return getWingmanStatus();
    }

    res.status(400);
    return res.json({ status: "error", error: "'start' | 'stop' | 'restart' | 'status' is required" });
}
