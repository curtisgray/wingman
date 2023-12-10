/* eslint-disable react-hooks/exhaustive-deps */
import { ConnectionStatus, DownloadServerAppItem, WingmanWebSocketMessage, newWingmanWebSocketMessage } from "@/types/download";
import { LlamaStats, LlamaStatsTimings, newLlamaStatsTimings, LlamaStatsSystem, newLlamaStatsSystem, LlamaStatsMeta, newLlamaStatsMeta, LlamaStatsTensors, newLlamaStatsTensors } from "@/types/llama_stats";
import { WingmanContent, WingmanItem, WingmanItemStatus, WingmanServiceAppItem, WingmanStateProps, createWingmanItem, hasActiveStatus } from "@/types/wingman";
import { useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useRequestInferenceAction } from "./useRequestInferenceAction";
import useApiService from "@/services/useApiService";
import { useQuery } from "react-query";


function precisionRound(value: number, precision: number)
{
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}

// export function useWingman(inferencePort: number, monitorPort: number): WingmanStateProps;
export function useWingman(monitorPort: number = 6567): WingmanStateProps
{
    const fractionDigits = 1;
    // const [alias, setAlias] = useState<string>("");
    // const [modelRepo, setModelRepo] = useState<string>("");
    // const [filePath, setFilePath] = useState<string>("");
    const [status, setStatus] = useState<ConnectionStatus>("❓");
    // const [isGenerating, setIsGenerating] = useState<boolean>(false);
    // const continueGenerating = useRef<boolean>(true);
    // const [latestItem, setLatestItem] = useState<WingmanContent>();
    // const [items, setItems] = useState<WingmanContent[]>([]);
    // const startGenerating = async (content: string, probabilities_to_return?: number): Promise<void> =>
    //     new Promise<void>((resolve, reject) =>
    //     {
    //         setLatestItem(undefined);
    //         setItems([]);
    //         try {
    //             const controller = new AbortController();
    //             fetch(encodeURI(`http://localhost:${inferencePort}/completion`), {
    //                 method: "POST",
    //                 headers: {
    //                     "Content-Type": "text/event-stream"
    //                 },
    //                 signal: controller.signal,
    //                 body: JSON.stringify({ prompt: content, n_keep: -1, stream: true, n_probs: probabilities_to_return ?? 0 })
    //             }).then(async response =>
    //             {
    //                 if (!response.ok) {
    //                     throw new Error(`Server responded with ${response.statusText}`);
    //                 }
    //                 const data = response.body;

    //                 if (data === null) {
    //                     const errorString = "Response body is null";
    //                     console.error(errorString);
    //                     reject(new Error(errorString));
    //                 } else {
    //                     const reader = data.getReader();
    //                     const decoder = new TextDecoder();
    //                     let done = false;
    //                     let text = "";
    //                     setIsGenerating(true);
    //                     continueGenerating.current = true;
    //                     while (!done) {
    //                         if (!continueGenerating.current) {
    //                             controller.abort();
    //                             done = true;
    //                             break;
    //                         }
    //                         const { value, done: doneReading } = await reader.read();
    //                         done = doneReading;
    //                         const chunkValue = decoder.decode(value);
    //                         if (chunkValue === "") {
    //                             continue;
    //                         }
    //                         // grab everything between "data: " and "\n\n"
    //                         text += chunkValue;
    //                         const data = text.split("data: ")[1]?.split("\n\n")[0];
    //                         if (data === undefined) {
    //                             continue;
    //                         }
    //                         const content = JSON.parse(data) as WingmanContent;
    //                         // onNewContent(content);
    //                         setLatestItem(content);
    //                         // setItems([...items, content]);
    //                         setItems((items) => items.concat(content));
    //                         text = "";
    //                     }
    //                     setIsGenerating(false);
    //                     resolve();
    //                 }
    //             });
    //         } catch (error) {
    //             const errorString = new Error(`Error in sendPrompt: ${error}`);
    //             console.error(errorString);
    //             return Promise.reject(errorString);
    //         }
    //     });
    // const stopGenerating = (): void =>
    // {
    //     continueGenerating.current = false;
    // };
    const [timeSeries, setTimeSeries] = useState<LlamaStats[]>([]);
    const [meta, setMeta] = useState<LlamaStatsMeta>(() => newLlamaStatsMeta());
    const [system, setSystem] = useState<LlamaStatsSystem>(() => newLlamaStatsSystem());
    const [tensors, setTensors] = useState<LlamaStatsTensors>(() => newLlamaStatsTensors());
    const [metrics, setMetrics] = useState<LlamaStatsTimings>(() => newLlamaStatsTimings());
    const [lastTime, setLastTime] = useState<Date>(new Date());
    const [pauseMetrics, setPauseMetrics] = useState<boolean>(false);
    const [downloadServiceStatus, setDownloadServiceStatus] = useState<DownloadServerAppItem | undefined>(undefined);
    const [wingmanServiceStatus, setWingmanServiceStatus] = useState<WingmanServiceAppItem | undefined>(undefined);
    // const [wingmanStatus, setWingmanStatus] = useState<WingmanItemStatus>("unknown");
    // const [wingmanItem, setWingmanItem] = useState<WingmanItem>(() => createWingmanItem("", "", ""));
    const [wingmanItems, setWingmanItems] = useState<WingmanItem[]>([]);
    const [currentWingmanInferenceItem, setCurrentWingmanInferenceItem] = useState<WingmanItem | undefined>(undefined);
    // const [isInferring, setIsInferring] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [lastWebSocketMessage, setLastWebSocketMessage] = useState<WingmanWebSocketMessage>(() => newWingmanWebSocketMessage());

    // const inferenceActions = useRequestInferenceAction();

    // const forceChosenModel = (alias: string, modelRepo: string, filePath: string): void =>
    // {
    //     setAlias(alias);
    //     setModelRepo(modelRepo);
    //     setFilePath(filePath);
    // };

    // const activate = async (alias: string, modelRepo: string, filePath: string, gpuLayers: number): Promise<WingmanItem | undefined> =>{
    //     // forceChosenModel(alias, modelRepo, filePath);
    //     return inferenceActions.requestStartInference(alias, modelRepo, filePath, gpuLayers);
    // };
    // const deactivate = async (): Promise<void> => {
    //     // if (alias === "") return Promise.reject("Alias is empty");
    //     // if (modelRepo === "") return Promise.reject("ModelRepo is empty");
    //     // if (filePath === "") return Promise.reject("FilePath is empty");
    //     // setAlias("");
    //     // setModelRepo("");
    //     // setFilePath("");
    //     const alias = inferringWingmanItem?.alias;
    //     return inferenceActions.requestStopInference(alias);
    // };
   
    const {
        lastMessage,
        readyState,
    } = useWebSocket(`ws://localhost:${monitorPort}`,
        {
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
            // if (json?.isa === "WingmanItem") {
            //     // insert into wingmanItems list, careful to overwrite existing items
            //     const item = json as WingmanItem;

            //     const index = wingmanItems.findIndex((i) => i.alias === item.alias);
            //     if (index === -1) {
            //         setWingmanItems([...wingmanItems, item]);
            //     } else {
            //         const newItems = [...wingmanItems];
            //         newItems[index] = item;
            //         setWingmanItems(newItems);
            //     }
            // }   // TODO: remove WingmanItems after they've been in the list for a while
            const date = new Date();
            setLastTime(date);
        }
    }, [lastMessage, pauseMetrics]);

    const { getWingmanItems } = useApiService();
    const { data: currentWingmanItems, error: currentWingmanItemsError } = useQuery(
        "GetWingmanItems",
        getWingmanItems,
        { enabled: true, refetchIntervalInBackground: true, refetchInterval: 3000 }
    );

    useEffect(() =>
    {
        if (currentWingmanItems) {
            if (currentWingmanItems !== undefined && currentWingmanItems.length > 0) {
                setWingmanItems(currentWingmanItems);
                const wi = currentWingmanItems.find((wi) => hasActiveStatus(wi));
                if (wi?.alias !== currentWingmanInferenceItem?.alias) {
                    if (wi !== undefined) {
                        setCurrentWingmanInferenceItem(wi);
                    } else {
                        setCurrentWingmanInferenceItem(undefined);
                    }
                }
            }
            // this is also being done in the useWingman hook using real-time updates
            // wingmanDispatch({ field: "wingmanItems", value: currentWingmanItems });
        }
    }, [currentWingmanItems]);

    useEffect(() =>
    {
        setStatus(connectionStatus as ConnectionStatus);
        setIsOnline(readyState === ReadyState.OPEN);
    }, [readyState]);

    return {
        // status: connectionStatus as ConnectionStatus, isOnline: readyState === ReadyState.OPEN,
        status, isOnline,
        // isGenerating,
        // latestItem,
        // items,
        // startGenerating, stopGenerating,
        pauseMetrics,
        // toggleMetrics: () => setPauseMetrics(!pauseMetrics),
        timeSeries, meta, system, tensors, metrics, lastTime,
        wingmanServiceStatus,downloadServiceStatus,
        wingmanItems,
        currentWingmanInferenceItem,
        lastWebSocketMessage,
    };
}
