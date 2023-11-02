import { ConnectionStatus, DownloadServerAppItem } from "@/types/download";
import { LlamaStats, LlamaStatsTimings, newLlamaStatsTimings, LlamaStatsSystem, newLlamaStatsSystem, LlamaStatsMeta, newLlamaStatsMeta, LlamaStatsTensors, newLlamaStatsTensors } from "@/types/llama_stats";
import { WingmanContent, WingmanItem, WingmanItemStatus, WingmanServerAppItem } from "@/types/wingman";
import { useContext, useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useRequestInferenceAction } from "./useRequestInferenceAction";
import HomeContext from "@/pages/api/home/home.context";

interface WingmanProps
{
    isGenerating: boolean;
    latestItem: WingmanContent | undefined;
    start: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    startGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    stopGenerating: () => void;
    toggleMetrics: () => void;
    timeSeries: LlamaStats[];
    meta: LlamaStatsMeta;
    system: LlamaStatsSystem;
    tensors: LlamaStatsTensors;
    metrics: LlamaStatsTimings;
    lastTime: Date;
    isOnline: boolean;
    status: ConnectionStatus;
    statusWingman: WingmanServerAppItem | undefined;
    statusDownload: DownloadServerAppItem | undefined;
    wingmanStatus: WingmanItemStatus;
    isInferring: boolean;
}

function precisionRound(value: number, precision: number)
{
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}

export function useWingman(serverPort: number): WingmanProps
{
    const {
        state: { lastWebSocketMessage, isOnline },
    } = useContext(HomeContext);

    const fractionDigits = 1;
    const [status, setStatus] = useState<ConnectionStatus>("❓");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const continueGenerating = useRef<boolean>(true);
    const [latestItem, setLatestItem] = useState<WingmanContent>();
    const startGenerating = async (content: string, probabilities_to_return?: number): Promise<void> =>
        new Promise<void>((resolve, reject) =>
        {
            setLatestItem(undefined);
            try {
                const controller = new AbortController();
                fetch(encodeURI(`http://localhost:${serverPort}/completion`), {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/event-stream"
                    },
                    signal: controller.signal,
                    body: JSON.stringify({ prompt: content, n_keep: -1, stream: true, n_probs: probabilities_to_return ?? 0 })
                }).then(async response =>
                {
                    if (!response.ok) {
                        throw new Error(`Server responded with ${response.statusText}`);
                    }
                    const data = response.body;

                    if (data === null) {
                        const errorString = "Response body is null";
                        console.error(errorString);
                        reject(new Error(errorString));
                    } else {
                        const reader = data.getReader();
                        const decoder = new TextDecoder();
                        let done = false;
                        let text = "";
                        setIsGenerating(true);
                        continueGenerating.current = true;
                        while (!done) {
                            if (!continueGenerating.current) {
                                controller.abort();
                                done = true;
                                break;
                            }
                            const { value, done: doneReading } = await reader.read();
                            done = doneReading;
                            const chunkValue = decoder.decode(value);
                            if (chunkValue === "") {
                                continue;
                            }
                            // grab everything between "data: " and "\n\n"
                            text += chunkValue;
                            const data = text.split("data: ")[1]?.split("\n\n")[0];
                            if (data === undefined) {
                                continue;
                            }
                            const content = JSON.parse(data) as WingmanContent;
                            setLatestItem(content);
                            text = "";
                        }
                        setIsGenerating(false);
                        resolve();
                    }
                });
            } catch (error) {
                const errorString = new Error(`Error in sendPrompt: ${error}`);
                console.error(errorString);
                return Promise.reject(errorString);
            }
        });
    const stopGenerating = (): void =>
    {
        continueGenerating.current = false;
    };
    const [timeSeries, setTimeSeries] = useState<LlamaStats[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [meta, setMeta] = useState<LlamaStatsMeta>(() => newLlamaStatsMeta());
    const [system, setSystem] = useState<LlamaStatsSystem>(() => newLlamaStatsSystem());
    const [tensors, setTensors] = useState<LlamaStatsTensors>(() => newLlamaStatsTensors());
    const [metrics, setMetrics] = useState<LlamaStatsTimings>(() => newLlamaStatsTimings());
    const [lastTime, setLastTime] = useState<Date>(new Date());
    const [pauseMetrics, setPauseMetrics] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [downloadServiceStatus, setDownloadServiceStatus] = useState<DownloadServerAppItem | undefined>(undefined);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [wingmanServiceStatus, setWingmanServiceStatus] = useState<WingmanServerAppItem | undefined>(undefined);
    const [wingmanStatus, setWingmanStatus] = useState<WingmanItemStatus>("unknown");
    const [isInferring, setIsInferring] = useState<boolean>(false);

    const inferenceActions = useRequestInferenceAction();
    const start = async (alias: string, modelRepo: string, filePath: string, gpuLayers: number): Promise<WingmanItem | undefined> =>
        inferenceActions.requestStartInference(alias, modelRepo, filePath, gpuLayers);
   
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

    useEffect(() =>
    {
        if (lastMessage?.data) {
            const json = JSON.parse(lastMessage.data);
            // if ((lastWebSocketMessage?.lastMessage) != null) {
            //     const json = JSON.parse(lastWebSocketMessage.lastMessage);
            if (json.meta) {
                setMeta(json.meta);
            }
            if (json.system) {
                setSystem(json.system);
            }
            if (json.tensors) {
                setTensors(json.tensors);
            }
            if (json.timings && json.system?.has_next_token && !pauseMetrics) {
                const metrics = json.timings;
                Object.keys(metrics).forEach(function (key) { metrics[key] = precisionRound(metrics[key], fractionDigits); });
                setMetrics(metrics);
                setTimeSeries([...timeSeries, metrics].slice(-1000));
            }
            if (json?.WingmanService) {
                setWingmanServiceStatus(json.WingmanService);
            }
            if (json?.DownloadService) {
                setDownloadServiceStatus(json.DownloadService);
            }
            if (json?.isa === "WingmanItem") {
                const item = json as WingmanItem;
                setWingmanStatus(item.status);
                setIsInferring(item.status === "inferring");
            }
            const date = new Date();
            setLastTime(date);
        }
        if (lastWebSocketMessage?.connectionStatus) {
            setStatus(lastWebSocketMessage.connectionStatus);
        } else {
            setStatus("❓");
        }
    }, [timeSeries, lastMessage, pauseMetrics]);
    // }, [timeSeries, lastWebSocketMessage, pauseMetrics]);

    useEffect(() =>
    {
        setStatus(connectionStatus as ConnectionStatus);
    }, [connectionStatus]);

    return {
        // status: connectionStatus as ConnectionStatus, isOnline: readyState === ReadyState.OPEN,
        status, isOnline,
        isGenerating,
        latestItem,
        start, startGenerating, stopGenerating,
        toggleMetrics: () => setPauseMetrics(!pauseMetrics),
        timeSeries, meta, system, tensors, metrics, lastTime,
        statusWingman: wingmanServiceStatus, statusDownload: downloadServiceStatus,
        wingmanStatus, isInferring
    };
}
