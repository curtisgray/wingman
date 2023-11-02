import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";

export default function Home()
{
    // const url = new URL("/wingman/download", "http://localhost:3000");
    const url = new URL("ws://localhost:6568");
    // construct the websocket endpoint by replacing the protocol
    // with ws or wss
    const endpoint = url.href.replace(/^http/, "ws").replace(/^https/, "wss");


    const [message, setMessage] = useState<MessageEvent | null>(null);
    const [status, setStatus] = useState<string>("❓");
    const [isOnline, setIsOnline] = useState<boolean>(false);

    const ws = useWebSocket(endpoint, {
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

        setMessage(ws.lastMessage);
        return () =>
        {
            setIsOnline(false);
        };
    }, [ws.lastMessage?.data, ws.readyState]);

    let updated = "no data";
    let messageType = "no data";
    if (message?.data && message.data.length > 0) {
        const json = JSON.parse(message.data);
        const keys = Object.keys(json);
        if (keys.length > 0){
            messageType = keys[0];
            const obj = json[messageType];
            if (obj?.updated && isNaN(obj.updated) === false)
                updated = (new Date(obj.updated * 1000)).toLocaleTimeString();
        }
    }
    return (
        <div className="flex flex-col">
            <p>WebSocket status: {status}</p>
            <p>WebSocket isOnline: {isOnline ? "true" : "false"}</p>
            <p>WebSocket message type: {messageType}</p>
            <p>WebSocket message: {updated}</p>
        </div>
    );
}
