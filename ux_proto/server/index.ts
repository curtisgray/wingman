import "module-alias/register";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import path from "path";
import { stdout } from "process";
import { default as logger } from "@/utils/logger.winston";
import nextConfig from "@/next.config";
import { default as orm } from "@/utils/server/orm";
import { main as wingmanMain } from "./wingman";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const ENV = process.env.NODE_ENV !== "production";
const app = next({
    dev: ENV,
    conf: nextConfig,
    customServer: true,
});
const nextRequestHandler = app.getRequestHandler();

const SERVER_NAME = "nodeServer";
const SERVERS_DIR = path.join(__dirname);
logger.debug(`${SERVER_NAME}: SERVERS_DIR: ${SERVERS_DIR}`);

// catch any unhandled exceptions
process.on("uncaughtException", (err) =>
{
    logger.error(`${SERVER_NAME}: Uncaught exception: ${err}`);
    // process.exit(1);
});

app.prepare().then(async () =>
{
    try {
        // Initialize database
        await orm.initialize();
    }
    catch (err) {
        logger.error(`${SERVER_NAME}: Error initializing database: ${err}`);
        throw err;
    }
    // Start child service threads
    wingmanMain();

    // #region Websockets using individual servers per websocket
    const server = createServer((req, res) =>
    {
        const parsedUrl = parse(req.url!, true);
        nextRequestHandler(req, res, parsedUrl);
    });
    server.listen(PORT);

    // IMPORTANT: DO NOT MODIFY THIS LINE
    stdout.write(`> ${ENV ? "development" : process.env.NODE_ENV} listening on http://localhost:${PORT}\n`);
}).catch((err) =>
{
    logger.error(`${SERVER_NAME}: Error starting server: ${err}`);
});
