import HomeContext from "@/pages/api/home/home.context";
import { ConnectionStatus } from "@/types/download";
import { WingmanItem, WingmanServerAppItem } from "@/types/wingman";
import { useContext, useEffect, useState } from "react";
// import useWebSocket, { ReadyState } from "react-use-websocket";

interface WingmanServerProps
{
    isOnline: boolean;
    item: WingmanItem | undefined;
    serverStatus: WingmanServerAppItem;
    status: ConnectionStatus;
    start: (alias: string, modelRepo: string, filePath: string) => Promise<void>;
}

export function useWingmanService(
    modelRepo: string | undefined = undefined,
    filePath: string | undefined = undefined): WingmanServerProps
{
    const {
        state: { lastWebSocketMessage, isOnline },
    } = useContext(HomeContext);

    const [item, setItem] = useState<WingmanItem>();
    const [serverStatus, setServerStatus] = useState<WingmanServerAppItem>({ isa: "WingmanServerAppItem", status: "unknown", alias: "unknown", modelRepo: "", filePath: "", created: Date.now(), updated: Date.now() });
    const [status, setStatus] = useState<ConnectionStatus>("❓");

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

    // const {
    //     lastMessage,
    //     readyState,
    // } = useWebSocket("ws://localhost:6568",
    //     {
    //         // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //         shouldReconnect: (_closeEvent) => true,
    //         reconnectAttempts: 9999999,
    //         reconnectInterval: 1000,
    //     });
    // const connectionStatus = {
    //     [ReadyState.CONNECTING]: "🔄",
    //     [ReadyState.OPEN]: "✅",
    //     [ReadyState.CLOSING]: "⏳",
    //     [ReadyState.CLOSED]: "❌",
    //     [ReadyState.UNINSTANTIATED]: "❓",
    // }[readyState];

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

    // useEffect(() =>
    // {
    //     onMessageEvent(lastMessage?.data as string);
    // }, [lastMessage]);

    useEffect(() =>
    {
        onMessageEvent(lastWebSocketMessage?.lastMessage as string);
        if (lastWebSocketMessage?.connectionStatus) {
            setStatus(lastWebSocketMessage.connectionStatus);
        } else {
            setStatus("❓");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastWebSocketMessage]);

    // return { status: connectionStatus as ConnectionStatus, isOnline: readyState == ReadyState.OPEN, item, serverStatus, start };
    return { status, isOnline: isOnline, item, serverStatus, start };
}
