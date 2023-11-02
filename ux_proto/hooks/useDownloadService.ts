import { AIModel, AIModels } from "@/types/ai";
import { ConnectionStatus, DownloadItem, DownloadServerAppItem } from "@/types/download";
import React from "react";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

interface DownloadServerProps
{
    isOnline: boolean;
    item: DownloadItem | undefined;
    serverStatus: DownloadServerAppItem;
    status: ConnectionStatus;
    refresh: () => Promise<void>;
    models: AIModel[];
    downloads: DownloadItem[];
}

export function useDownloadService(
    modelRepo: string | undefined = undefined,
    filePath: string | undefined = undefined): DownloadServerProps
{
    const [item, setItem] = useState<DownloadItem>();
    const [serverStatus, setServerStatus] = useState<DownloadServerAppItem>({ isa: "DownloadServerAppItem", status: "unknown", created: Date.now(), updated: Date.now() });
    const aiModels = Object.values(AIModels);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [models, setModels] = useState<AIModel[]>(aiModels);
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);

    const getModels = async () =>
    {
        const response = await fetch("http://localhost:6568/api/models");
        if (!response.ok) {
            console.log(`error getting models: ${response.statusText}`);
        } else {
            console.log(`getModels response: ${response?.statusText}`);
            const json = await response.json();
            setModels(aiModels.concat(json.models));
        }
        return response;
    };

    const getDownloads = async () =>
    {
        const response = await fetch("http://localhost:6568/api/downloads");
        if (!response.ok) {
            console.log(`error getting downloads: ${response.statusText}`);
        } else {
            console.log(`getModels response: ${response?.statusText}`);
            const json = await response.json();
            setDownloads(json.downloads);
        }
        return response;
    };

    const refresh = async () =>
    {
        await getModels();
        await getDownloads();
    };

    const {
        lastMessage,
        readyState,
    } = useWebSocket("ws://localhost:6568",
        {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            shouldReconnect: (_closeEvent) => true,
            reconnectAttempts: 9999999,
            reconnectInterval: 1000,
        });
    const connectionStatus = {
        [ReadyState.CONNECTING]: "🔄",
        [ReadyState.OPEN]: "✅",
        [ReadyState.CLOSING]: "⏳",
        [ReadyState.CLOSED]: "❌",
        [ReadyState.UNINSTANTIATED]: "❓",
    }[readyState];

    function onDownloadItemsEvent(value: DownloadItem)
    {
        if (modelRepo === undefined || filePath === undefined) {
            setItem(value);
        } else {
            // filter out any items that don't match the modelRepo and filePath
            setItem((value.modelRepo === modelRepo && value.filePath === filePath) ? value : undefined);
        }
    }

    function onServerStatusEvent(value: DownloadServerAppItem)
    {
        setServerStatus(value);
    }

    function onMessageEvent(message: string)
    {
        if (message === undefined || message === "") {
            return;
        }
        const msg = JSON.parse(message);
        if (msg.isa === "DownloadServerAppItem") {
            onServerStatusEvent(msg);
        } else if (msg.isa === "DownloadItem") {
            onDownloadItemsEvent(msg);
        }
    }

    useEffect(() =>
    {
        onMessageEvent(lastMessage?.data as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage]);

    useEffect(() =>
    {
        // refresh();
    });

    return {
        status: connectionStatus as ConnectionStatus,
        isOnline: readyState == ReadyState.OPEN,
        item, serverStatus, refresh,
        models, downloads
    };
}
