import React, { useEffect, useState } from "react";

// a minimal example of a websocket client
export default function Home()
{
    const [message, setMessage] = useState<MessageEvent | undefined>(undefined);
    const [isOnline, setIsOnline] = useState<boolean>(false);

    useEffect(() =>
    {
        const url = new URL("/wingman/download", window.location.href);
        const endpoint = url.href;

        const ws = new WebSocket(endpoint);
        console.log(`*** WebSocket mount: ${endpoint} ***`);

        ws.onopen = () =>
        {
            console.log(`WebSocket opened: ${endpoint}`);
        };

        ws.onclose = (e: CloseEvent) =>
        {
            console.log(`WebSocket closed: ${endpoint} (${e.code}): ${e.reason}`);
        };

        ws.onmessage = (data) =>
        {
            setMessage(data);
        };

        ws.onerror = (error) =>
        {
            console.log(`WebSocket error (${endpoint}): ${error}`);
        };

        return () =>
        {
            console.log(`*** WebSocket unmount: ${endpoint} ***`);
            ws.close();
            setIsOnline(false);
        };
    }, []);
    return (
        <div className="flex flex-col">
            <p>WebSocket isOnline: {isOnline ? "true" : "false"}</p>
            <p>WebSocket message: {message?.data}</p>
        </div>
    );
}
