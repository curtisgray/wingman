import { DownloadItem, DownloadServer } from "@/types/download";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

interface DownloadServerProps
{
    status: string;
    item: DownloadItem | undefined;
    serverStatus: DownloadServer;
    requestShutdown: () => void;
}

export function useDownloadServer(
    modelRepo: string | undefined = undefined,
    filePath: string | undefined = undefined): DownloadServerProps
{
    const [item, setItem] = useState<DownloadItem>();
    const [serverStatus, setServerStatus] = useState<DownloadServer>({ isa: "DownloadServer", status: "unknown", created: Date.now(), updated: Date.now() });
    // const [message, setMessage] = useState<MessageEvent | null>(null);
    // const [status, setStatus] = useState<string>("");
    // const [send, setSend] = useState<((data: string) => void) | undefined>();
    // const [connectionState, setConnectionState] = useState<ReadyState>(ReadyState.UNINSTANTIATED);

    const {
        lastMessage,
        readyState,
        sendMessage,
    } = useWebSocket("ws://localhost:3000",
        {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            shouldReconnect: (_closeEvent) => true,
            reconnectAttempts: 9999999,
            reconnectInterval: 1000,
            onOpen: console.debug,
            onClose: console.debug,
            onError: console.debug,
        });
    const connectionStatus = {
        [ReadyState.CONNECTING]: "🔄",
        [ReadyState.OPEN]: "✅",
        [ReadyState.CLOSING]: "⏳",
        [ReadyState.CLOSED]: "❌",
        [ReadyState.UNINSTANTIATED]: "❓",
    }[readyState];


    const requestShutdown = () =>
    {
        if (readyState === ReadyState.OPEN) {
            sendMessage?.("shutdown");
        }
    };

    function onDownloadItemsEvent(value: DownloadItem)
    {
        if (modelRepo === undefined || filePath === undefined) {
            setItem(value);
        } else {
            // filter out any items that don't match the modelRepo and filePath
            setItem((value.modelRepo === modelRepo && value.filePath === filePath) ? value : undefined);
        }
    }

    function onServerStatusEvent(value: DownloadServer)
    {
        setServerStatus(value);
    }

    function onMessageEvent(message: string)
    {
        if (message === "") {
            return;
        }
        const msg = JSON.parse(message);
        if (msg.isa === "DownloadServer") {
            onServerStatusEvent(msg);
        } else if (msg.isa === "DownloadItem") {
            onDownloadItemsEvent(msg);
        }
    }

    useEffect(() =>
    {
        onMessageEvent(lastMessage?.data ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage]);

    return { status: connectionStatus, item, serverStatus, requestShutdown };
}
