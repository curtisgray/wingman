import { DownloadItem, DownloadServer } from "@/types/download";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface DownloadServerProps
{
    isOnline: boolean;
    downloadItems: DownloadItem[];
    serverStatus: DownloadServer;
    requestShutdown: () => void;
}

export function useDownloadServer(
    modelRepo: string | undefined = undefined,
    filePath: string | undefined = undefined): DownloadServerProps
{

    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [downloadItems, setDownloadItems] = useState<DownloadItem[]>([]);
    const [serverStatus, setServerStatus] = useState<DownloadServer>({ isa: "DownloadServer", status: "unknown", created: Date.now(), updated: Date.now() });
    
    const requestShutdown = () =>
    {
        // socket.emit("shutdown");
        throw new Error("Not implemented");
    };

    useEffect(() =>
    {
        const socket = io();

        function onConnect()
        {
            setIsOnline(true);
            // console.debug("useDownloadServer: socket is connected");
        }

        function onDisconnect()
        {
            setIsOnline(false);
            // console.debug("useDownloadServer: socket is disconnected");
        }

        function onDownloadItemsEvent(value: DownloadItem[])
        {
            if (modelRepo === undefined || filePath === undefined) {
                setDownloadItems(value);
                // console.debug(`useDownloadServer: downloadItems updated: ${value.length} items`);
            } else {
                // filter out any items that don't match the modelRepo and filePath
                setDownloadItems(value.filter(item => item.modelRepo === modelRepo && item.filePath === filePath));
                // console.debug(`useDownloadServer: filtered downloadItems updated: ${modelRepo}/${filePath}`);
            }
        }

        function onServerStatusEvent(value: DownloadServer)
        {
            setServerStatus(value);
            // console.debug(`useDownloadServer: serverStatus updated: ${JSON.stringify(value)}`);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        socket.on("downloadItems", onDownloadItemsEvent);
        socket.on("downloadServerStatus", onServerStatusEvent);

        return () =>
        {
            // socket.off("connect", onConnect);
            // socket.off("disconnect", onDisconnect);

            // socket.off("downloadItems", onDownloadItemsEvent);
            // socket.off("downloadServerStatus", onServerStatusEvent);
            socket.removeAllListeners();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [downloadItems, serverStatus]);

    return { isOnline, downloadItems, serverStatus, requestShutdown };
}
