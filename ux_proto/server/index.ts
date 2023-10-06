import "module-alias/register";
import { IncomingMessage, createServer } from "http";
import ws from "ws";
import { parse } from "url";
import next from "next";
import path from "path";
import { stdout } from "process";
import { default as logger } from "@/utils/logger.winston";
import nextConfig from "@/next.config";
import { default as orm } from "@/utils/server/orm";
import { DownloadItem, DownloadServer } from "@/types/download";
import { WingmanItem, WingmanServer } from "@/types/wingman";
import { main as wingmanMain, stop as wingmanStop } from "./wingman";
import { main as downloadMain, stop as downloadStop } from "./download";

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
const SHUTDOWN_DELAY = 5000;  // milliseconds

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
    downloadMain();
    wingmanMain();

    // #region Websockets using individual servers per websocket
    const server = createServer((req, res) =>
    {
        const parsedUrl = parse(req.url!, true);
        nextRequestHandler(req, res, parsedUrl);
    });

    const wssDownload = new ws.WebSocketServer({ noServer: true });
    const wssWingman = new ws.WebSocketServer({ noServer: true });

    const handleConnection = (socket: ws.WebSocket, req: IncomingMessage, onSend: (socket: ws.WebSocket, timeToNotify: boolean) => Promise<void>) =>
    {
        const remoteAddress = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
        logger.debug(`${SERVER_NAME}: (websocket) client connected from ${remoteAddress}`);
        socket.onerror = (err) =>
        {
            logger.error(`${SERVER_NAME}: (websocket) socket error: ${err}`);
        };

        // start a timer to fire every X seconds and send status informaiton via socket.io
        const updateIntervalMs = 2500;
        const notificationIntervalMs = 10000;
        let lastNotification = Date.now();
        logger.debug(`${SERVER_NAME}: (websocket) [${remoteAddress}] starting timer to send status every ${updateIntervalMs}ms`);
        const timer = setInterval(async () =>
        {
            if (socket.readyState !== socket.OPEN) {
                return;
            }
            const timeToNotify = Date.now() - lastNotification > notificationIntervalMs;
            if (timeToNotify) {
                lastNotification = Date.now();
            }
            await onSend(socket, timeToNotify);
        }, updateIntervalMs);

        socket.onclose = (e) =>
        {
            clearInterval(timer);
            logger.debug(`${SERVER_NAME}: [${remoteAddress}] (websocket) client disconnected (${e.code}): ${e.reason}`);
            if (e.code === 1006) {
                // if the client disconnected without sending a close message, then the server will not receive the close event
                // putting the server into an unknown state. The socket must be destroyed on the server side to clean
                // up any lingering socket state.
                logger.error(`${SERVER_NAME}: [${remoteAddress}] (websocket) client disconnected without sending a close message. Terminating socket.`);
                socket.terminate();
            }
        };

        socket.onmessage = async (e) =>
        {
            if (e.data === "shutdown") {
                logger.debug(`${SERVER_NAME}: [${remoteAddress}] (websocket) shutting down in ${SHUTDOWN_DELAY / 1000} seconds}`);
                // wait a few seconds for the client to receive the message
                await new Promise(resolve => setTimeout(resolve, SHUTDOWN_DELAY));
                await downloadStop();
                await wingmanStop();
                socket.close(0, "shutdown");
                server.close(() =>
                {
                    logger.debug(`${SERVER_NAME}: [${remoteAddress}] (websocket) server closed`);
                });
            }
        };
    };

    wssDownload.on("connection", (socket, req) =>
    {
        const onSend = async (socket: ws.WebSocket, timeToNotify: boolean) =>
        {
            const remoteAddress = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
            const downloadItems: DownloadItem[] = await orm.getDownloadItems();
            const dss = await orm.getAppItemValue("huggingfaceDownload", "default");
            let downloadServerStatus: DownloadServer = { isa: "DownloadServer", status: "unknown", created: Date.now(), updated: Date.now() };
            if (dss !== undefined) {
                downloadServerStatus = JSON.parse(dss) as DownloadServer;
            } else {
                logger.error(`${SERVER_NAME}: (websocket) [${remoteAddress}] downloadServerStatus: nothing returned from getAppItemValue`);
            }
            if (timeToNotify) {
                logger.debug(`${SERVER_NAME}: (websocket) [${remoteAddress}] downloadItems: ${JSON.stringify(downloadItems)}`);
            }
            socket.send(JSON.stringify(downloadServerStatus));
            if (downloadItems.length > 0)
                socket.send(JSON.stringify(downloadItems));
        };
        handleConnection(socket, req, onSend);
    });
    wssDownload.on("error", (err) =>
    {
        logger.error(`${SERVER_NAME}: (wssDownload) error: ${err}`);
    });
    wssDownload.on("wsClientError", (err) =>
    {
        logger.error(`${SERVER_NAME}: (wssDownload) wsClientErrorerror: ${err}`);
    });

    wssWingman.on("connection", (socket, req) =>
    {
        const onSend = async (socket: ws.WebSocket, timeToNotify: boolean) =>
        {
            const remoteAddress = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
            const wingmanItems: WingmanItem[] = await orm.getWingmanItems();
            const wss = await orm.getAppItemValue("wingman.local", "default");
            let wingmanServerStatus: WingmanServer = { isa: "WingmanServer", status: "unknown", created: Date.now(), updated: Date.now() };
            if (wss !== undefined) {
                wingmanServerStatus = JSON.parse(wss) as WingmanServer;
            } else {
                logger.error(`${SERVER_NAME}: (websocket) [${remoteAddress}] wingmanServerStatus: nothing returned from getAppItemValue`);
            }
            if (timeToNotify) {
                logger.debug(`${SERVER_NAME}: (websocket) [${remoteAddress}] wingmanItems: ${JSON.stringify(wingmanItems)}`);
            }
            socket.send(JSON.stringify(wingmanServerStatus));
            if (wingmanItems.length > 0)
                socket.send(JSON.stringify(wingmanItems));
        };
        handleConnection(socket, req, onSend);
    });
    wssWingman.on("error", (err) =>
    {
        logger.error(`${SERVER_NAME}: (wssWingman) error: ${err}`);
    });
    wssWingman.on("wsClientError", (err) =>
    {
        logger.error(`${SERVER_NAME}: (wssWingman) wsClientError error: ${err}`);
    });

    server.on("upgrade", function upgrade(request, socket, head)
    {
        const { pathname } = parse(request.url!);
        const remoteAddress = `${request.socket.remoteAddress}:${request.socket.remotePort}`;

        if (pathname === "/wingman/download") {
            logger.debug(`${SERVER_NAME}: (websocket) [${remoteAddress}] upgrade request for /wingman/download`);
            wssDownload.handleUpgrade(request, socket, head, function done(ws)
            {
                wssDownload.emit("connection", ws, request);
            });
        } else if (pathname === "/wingman/wingman") {
            logger.debug(`${SERVER_NAME}: (websocket) [${remoteAddress}] upgrade request for /wingman/wingman`);
            wssWingman.handleUpgrade(request, socket, head, function done(ws)
            {
                wssWingman.emit("connection", ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    server.listen(PORT);

    // IMPORTANT: DO NOT MODIFY THIS LINE
    stdout.write(`> ${ENV ? "development" : process.env.NODE_ENV} listening on http://localhost:${PORT}\n`);
}).catch((err) =>
{
    logger.error(`${SERVER_NAME}: Error starting server: ${err}`);
    // process.exit(1);
});
