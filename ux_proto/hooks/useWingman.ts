import { ConnectionStatus, DownloadServerAppItem, WingmanWebSocketMessage, newWingmanWebSocketMessage } from "@/types/download";
import { LlamaStats, LlamaStatsTimings, newLlamaStatsTimings, LlamaStatsSystem, newLlamaStatsSystem, LlamaStatsMeta, newLlamaStatsMeta, LlamaStatsTensors, newLlamaStatsTensors } from "@/types/llama_stats";
import { WingmanContent, WingmanItem, WingmanItemStatus, WingmanServiceAppItem, WingmanStateProps, createWingmanItem } from "@/types/wingman";
import { useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useRequestInferenceAction } from "./useRequestInferenceAction";


function precisionRound(value: number, precision: number)
{
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}

// export function useWingman(inferencePort: number, monitorPort: number, onNewContent: (content: WingmanContent) => void = () => { }): WingmanProps;
export function useWingman(inferencePort: number, monitorPort: number): WingmanStateProps
{
    // const {
    //     state: { lastWebSocketMessage, isOnline },
    // } = useContext(HomeContext);

    const fractionDigits = 1;
    const [alias, setAlias] = useState<string>("");
    const [modelRepo, setModelRepo] = useState<string>("");
    const [filePath, setFilePath] = useState<string>("");
    const [status, setStatus] = useState<ConnectionStatus>("❓");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const continueGenerating = useRef<boolean>(true);
    const [latestItem, setLatestItem] = useState<WingmanContent>();
    const [items, setItems] = useState<WingmanContent[]>([]);
    const startGenerating = async (content: string, probabilities_to_return?: number): Promise<void> =>
        new Promise<void>((resolve, reject) =>
        {
            setLatestItem(undefined);
            setItems([]);
            try {
                const controller = new AbortController();
                fetch(encodeURI(`http://localhost:${inferencePort}/completion`), {
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
                            // onNewContent(content);
                            setLatestItem(content);
                            // setItems([...items, content]);
                            setItems((items) => items.concat(content));
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
    const [wingmanServiceStatus, setWingmanServiceStatus] = useState<WingmanServiceAppItem | undefined>(undefined);
    const [wingmanStatus, setWingmanStatus] = useState<WingmanItemStatus>("unknown");
    const [wingmanItem, setWingmanItem] = useState<WingmanItem>(() => createWingmanItem("", "", ""));
    const [isInferring, setIsInferring] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [lastWebSocketMessage, setLastWebSocketMessage] = useState<WingmanWebSocketMessage>(() => newWingmanWebSocketMessage());

    const inferenceActions = useRequestInferenceAction();

    const forceChosenModel = (alias: string, modelRepo: string, filePath: string): void =>
    {
        setAlias(alias);
        setModelRepo(modelRepo);
        setFilePath(filePath);
    };

    const activate = async (alias: string, modelRepo: string, filePath: string, gpuLayers: number): Promise<WingmanItem | undefined> =>{
        forceChosenModel(alias, modelRepo, filePath);
        return inferenceActions.requestStartInference(alias, modelRepo, filePath, gpuLayers);
    };
    const deactivate = async (): Promise<void> => {
        if (alias === "") return Promise.reject("Alias is empty");
        if (modelRepo === "") return Promise.reject("ModelRepo is empty");
        if (filePath === "") return Promise.reject("FilePath is empty");
        setAlias("");
        setModelRepo("");
        setFilePath("");
        return inferenceActions.requestStopInference(alias);
    };
   
    const {
        lastMessage,
        readyState,
    } = useWebSocket(`ws://localhost:${monitorPort}`,
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
            const message: WingmanWebSocketMessage = {
                lastMessage: lastMessage.data,
                connectionStatus: connectionStatus as ConnectionStatus,
            };
            setLastWebSocketMessage(message);
            if (json.meta) {
                setMeta(json.meta);
            }
            if (json.system) {
                setSystem(json.system);

                // if (json.system.has_next_token){
                //     setIsGenerating(true);
                // } else {
                //     setIsGenerating(false);
                // }
            }
            if (json.tensors) {
                setTensors(json.tensors);
            }
            if (json.timings && !pauseMetrics) {
                const metrics = json.timings;
                Object.keys(metrics).forEach(function (key) { metrics[key] = precisionRound(metrics[key], fractionDigits); });
                setMetrics(metrics);
                setTimeSeries([...timeSeries, metrics].slice(-100));
            }
            if (json?.WingmanService) {
                setWingmanServiceStatus(json.WingmanService);
            }
            if (json?.DownloadService) {
                setDownloadServiceStatus(json.DownloadService);
            }
            // return whichever wingman item is inferring
            if (json?.isa === "WingmanItem" && json?.alias === alias) {
                const item = json as WingmanItem;
                setWingmanStatus(item.status);
                setIsInferring(item.status === "inferring");
                setWingmanItem(item);
            }
            const date = new Date();
            setLastTime(date);
        }
        // if (lastWebSocketMessage?.connectionStatus) {
        //     setStatus(lastWebSocketMessage.connectionStatus);
        // } else {
        //     setStatus("❓");
        // }
    }, [lastMessage, pauseMetrics]);
    // }, [timeSeries, lastMessage, pauseMetrics]);
    // }, [timeSeries, lastWebSocketMessage, pauseMetrics]);

    useEffect(() =>
    {
        setStatus(connectionStatus as ConnectionStatus);
        setIsOnline(readyState === ReadyState.OPEN);
    }, [readyState]);

    return {
        // status: connectionStatus as ConnectionStatus, isOnline: readyState === ReadyState.OPEN,
        alias, modelRepo, filePath, forceChosenModel,
        status, isOnline,
        isGenerating,
        latestItem,
        items,
        activate, deactivate, startGenerating, stopGenerating,
        pauseMetrics,
        toggleMetrics: () => setPauseMetrics(!pauseMetrics),
        timeSeries, meta, system, tensors, metrics, lastTime,
        wingmanServiceStatus: wingmanServiceStatus, downloadServiceStatus: downloadServiceStatus,
        wingmanStatus, isInferring, wingmanItem,
        lastWebSocketMessage,
    };
}
