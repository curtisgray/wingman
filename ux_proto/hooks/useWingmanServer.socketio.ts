import { WingmanItem, WingmanServer } from "@/types/wingman";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface WingmanServerProps
{
    isOnline: boolean;
    items: WingmanItem[];
    serverStatus: WingmanServer;
    requestShutdown: () => void;
    start: (alias: string, modelRepo: string, filePath: string) => Promise<void>;
}

export function useWingmanServer(): WingmanServerProps
{
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [items, setItems] = useState<WingmanItem[]>([]);
    const [serverStatus, setStatus] = useState<WingmanServer>({ isa: "WingmanServer", status: "unknown", created: Date.now(), updated: Date.now() });

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
                        const errorString = `(useWingman.socketio) Server responded with ${response.statusText}`;
                        reject(new Error(errorString));
                    }
                });
        });

    const requestShutdown = () =>
    {
        // socket.emit("shutdown");
    };

    useEffect(() =>
    {
        const socket = io();

        function onConnect()
        {
            setIsOnline(true);
            // console.debug("useWingmanServer: socket is connected");
        }

        function onDisconnect()
        {
            setIsOnline(false);
            // console.debug("useWingmanServer: socket is disconnected");
        }

        function onItemsEvent(value: WingmanItem[])
        {
            setItems(value);
            // console.debug(`useWingmanServer: items updated: ${value.length} items`);
        }

        function onStatusEvent(value: WingmanServer)
        {
            setStatus(value);
            // console.debug(`useWingmanServer: serverStatus updated: ${JSON.stringify(value)}`);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        socket.on("wingmanItems", onItemsEvent);
        socket.on("wingmanServerStatus", onStatusEvent);

        return () =>
        {
            // socket.off("connect", onConnect);
            // socket.off("disconnect", onDisconnect);

            // socket.off("wingmanItems", onItemsEvent);
            // socket.off("wingmanServerStatus", onStatusEvent);
            socket.removeAllListeners();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, items, serverStatus]);

    return { isOnline, items, serverStatus, requestShutdown, start };
}
