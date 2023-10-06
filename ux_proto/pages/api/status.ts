import { NextApiRequest, NextApiResponse } from "next";
import { default as logger } from "@/utils/logger.winston";
// import { getAppItemValue } from "@/utils/server/orm.Sqlite";
import { default as orm } from "@/utils/server/orm";


const SERVER_NAME = "status_handler";

export default async function handler(req: NextApiRequest, res: NextApiResponse)
{
    logger.debug(`${SERVER_NAME}: request from ${req.headers["x-forwarded-for"]?.toString ?? req.socket.remoteAddress} for ${req.url}`);
    res.status(200).json(await orm.getAppItemValue("downloadServer", "default"));
}
