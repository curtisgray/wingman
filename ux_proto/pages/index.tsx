import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";

export default function Home()
{
    const url = new URL("/wingman/download", "http://localhost:3000");
    // construct the websocket endpoint by replacing the protocol
    // with ws or wss
    const endpoint = url.href.replace(/^http/, "ws").replace(/^https/, "wss");


    const [message, setMessage] = useState<MessageEvent | undefined>(undefined);
    const [status, setStatus] = useState<string>("❓");
    const [isOnline, setIsOnline] = useState<boolean>(false);

    const ws = useWebSocket(endpoint,        {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        shouldReconnect: (_closeEvent) => true,
        reconnectAttempts: 9999999,
        reconnectInterval: 1000,
        onOpen: console.debug,
        onClose: console.debug,
        onError: console.debug,
    });

    useEffect(() =>
    {
        switch (ws.readyState) {
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
                break;
            default:
                setStatus("❓");
                setIsOnline(false);
                break;
        }

        setMessage(ws.lastMessage?.data);
        return () =>
        {
            setIsOnline(false);
        };
    }, [ws.lastMessage?.data, ws.readyState]);
    return (
        <div className="flex flex-col">
            <p>WebSocket status: {status}</p>
            <p>WebSocket isOnline: {isOnline ? "true" : "false"}</p>
            <p>WebSocket message: {message?.data}</p>
        </div>
    );
}
