import { ConnectionStatus } from "@/types/download";
import { WingmanItem, WingmanServerAppItem } from "@/types/wingman";
import { useEffect, useState } from "react";

interface WingmanServerProps
{
    isOnline: boolean;
    item: WingmanItem | undefined;
    serverStatus: WingmanServerAppItem;
    status: ConnectionStatus;
    start: (alias: string, modelRepo: string, filePath: string) => Promise<void>;
}

export function useWingmanServer(
    modelRepo: string | undefined = undefined,
    filePath: string | undefined = undefined): WingmanServerProps
{
    const [item, setItem] = useState<WingmanItem>();
    const [serverStatus, setServerStatus] = useState<WingmanServerAppItem>({ isa: "WingmanServerAppItem", status: "unknown", created: Date.now(), updated: Date.now() });
    const [message, setMessage] = useState<MessageEvent>();
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [status, setStatus] = useState<ConnectionStatus>("❓");
    const [readyState, setReadyState] = useState<WebSocket["readyState"]>(WebSocket.CONNECTING);
    const start = async (alias: string, modelRepo: string, filePath: string, force: boolean = false): Promise<void> =>
        new Promise<void>((resolve, reject) =>
        {
            const url = `/api/wingman?start&alias=${alias}&modelRepo=${modelRepo}&filePath=${filePath}&${force === true ? "force" : ""}`;
            fetch(url)
                .then(response =>
                {
                    if (response.ok) {
                        resolve();
                    } else {
                        reject(new Error(response.statusText));
                    }
                });
        });

    useEffect(() =>
    {
        const url = new URL("/wingman/wingman", window.location.href);

        const createWebSocket = () =>
        {
            url.protocol = url.protocol.replace("http", "ws").replace("https", "wss");
            const ws = new WebSocket(url.href);

            ws.onopen = () =>
            {
                console.log(`WebSocket opened: ${url.href}`);
            };

            ws.onclose = (e: CloseEvent) =>
            {
                console.log(`WebSocket closed: ${url.href} (${e.code}): ${e.reason}`);
                clearInterval(interval);
            };

            ws.onmessage = (data) =>
            {
                setMessage(data);
            };

            ws.onerror = (error) =>
            {
                console.log(`WebSocket error (${url.href}): ${error}`);
            };

            const interval = setInterval(() =>
            {
                setReadyState(ws.readyState);
                if (ws.readyState === WebSocket.CLOSED) {
                    // clearInterval(interval);
                }
            }, 1000);

            return ws;
        };

        let ws = createWebSocket();

        const interval = setInterval(() =>
        {
            switch (readyState) {
                case WebSocket.CONNECTING:
                    setStatus("🔄");
                    setIsOnline(false);
                    break;
                case WebSocket.OPEN:
                    setStatus("✅");
                    setIsOnline(true);
                    break;
                case WebSocket.CLOSING:
                    setStatus("⏳");
                    setIsOnline(false);
                    break;
                case WebSocket.CLOSED:
                    setStatus("❌");
                    setIsOnline(false);
                    // reconnect logic
                    // wait 5 seconds before reconnecting
                    setTimeout(() =>
                    {
                        console.log("Reconnecting...");
                        ws = createWebSocket();
                    }, 5000);
                    break;
                default:
                    setStatus("❓");
                    setIsOnline(false);
                    break;
            }
            console.log(`WebSocket status: ${status}`);
        }, 1000);

        return () =>
        {
            console.log(`WebSocket unmount: ${url.href}`);
            ws.close();
            setIsOnline(false);
            clearInterval(interval);
        };
    }, []);

    function onWingmanItemsEvent(value: WingmanItem)
    {
        if (modelRepo === undefined || filePath === undefined) {
            setItem(value);
        } else {
            // filter out any items that don't match the modelRepo and filePath
            setItem((value.modelRepo === modelRepo && value.filePath === filePath) ? value : undefined);
        }
    }

    function onServerStatusEvent(value: WingmanServerAppItem)
    {
        setServerStatus(value);
    }

    function onMessageEvent(message: string)
    {
        if (message === undefined || message === "") {
            return;
        }
        const msg = JSON.parse(message);
        if (msg.isa === "WingmanServerAppItem") {
            onServerStatusEvent(msg);
        } else if (msg.isa === "WingmanItem") {
            onWingmanItemsEvent(msg);
        }
    }

    useEffect(() =>
    {
        onMessageEvent(message?.data as string);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [message]);

    return { status, isOnline, item, serverStatus, start };
}
