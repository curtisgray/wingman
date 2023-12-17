/* eslint-disable react-hooks/exhaustive-deps */
import { ConnectionStatus, DownloadItem, DownloadServerAppItem, WingmanWebSocketMessage, newWingmanWebSocketMessage } from "@/types/download";
import { LlamaStats, LlamaStatsTimings, newLlamaStatsTimings, LlamaStatsSystem, newLlamaStatsSystem, LlamaStatsMeta, newLlamaStatsMeta, LlamaStatsTensors, newLlamaStatsTensors } from "@/types/llama_stats";
import { WingmanContent, WingmanItem, WingmanItemStatus, WingmanServiceAppItem, WingmanStateProps, createWingmanItem, hasActiveStatus } from "@/types/wingman";
import { useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { useRequestInferenceAction } from "./useRequestInferenceAction";
import useApiService from "@/services/useApiService";
import { useQuery } from "react-query";
import { isEqual } from "lodash";
import { initialWingmanState } from "@/pages/api/home/wingman.state";
import { useCreateReducer } from "./useCreateReducer";


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
    const [downloadItems, setDownloadItems] = useState<DownloadItem[]>([]);
    const [currentWingmanInferenceItem, setCurrentWingmanInferenceItem] = useState<WingmanItem | undefined>(undefined);
    // const [isInferring, setIsInferring] = useState<boolean>(false);
    const [isOnline, setIsOnline] = useState<boolean>(false);
    // const [lastWebSocketMessage, setLastWebSocketMessage] = useState<WingmanWebSocketMessage>(() => newWingmanWebSocketMessage());


    const wingmanContextValue = useCreateReducer<WingmanStateProps>({
        initialState: initialWingmanState,
    });

    const {
        dispatch: wingmanDispatch,
    } = wingmanContextValue;

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
            // const json = JSON.parse(JSON.stringify(lastMessage.data));
            const json = JSON.parse(lastMessage.data);
            // const message: WingmanWebSocketMessage = {
            //     lastMessage: lastMessage.data,
            //     connectionStatus: connectionStatus as ConnectionStatus,
            // };
            // if (!isEqual(message, lastWebSocketMessage))
            //     setLastWebSocketMessage(message);
            if (json?.meta) {
                if (!isEqual(json?.meta, meta))
                    setMeta(json.meta);
            }
            if (json?.system) {
                if (!isEqual(json?.system, system))
                    setSystem(json.system);
            }
            if (json?.tensors) {
                if (!isEqual(json?.tensors, tensors))
                    setTensors(json.tensors);
            }
            if (json?.timings && !pauseMetrics) {
                const metrics = json.timings;
                Object.keys(metrics).forEach(function (key) { metrics[key] = precisionRound(metrics[key], fractionDigits); });
                setMetrics(metrics);
                setTimeSeries([...timeSeries, metrics].slice(-100));
            }
            if (json?.WingmanService) {
                if (!isEqual(json?.WingmanService, wingmanServiceStatus))
                    setWingmanServiceStatus(json.WingmanService);
            }
            if (json?.DownloadService) {
                if (!isEqual(json?.DownloadService, downloadServiceStatus))
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

            if (json?.WingmanItems) {
                if (!isEqual(json?.WingmanItems, wingmanItems)) {
                    setWingmanItems(json.WingmanItems);
                    // search for the currentWinmanInferenceItem in the list of currentWingmanItems
                    // if it's not there, check for the first item with an active status
                    // let wi = json.WingmanItems.find((w: WingmanItem) => w.alias === currentWingmanInferenceItem?.alias);
                    // if (wi === undefined) {
                    //     wi = json.WingmanItems.find((w: WingmanItem) => hasActiveStatus(w));
                    // }
                    // let's try setting the current inference item to the one that is inferring
                    const wi = json.WingmanItems.find((w: WingmanItem) => hasActiveStatus(w));
                    if (wi !== undefined && !isEqual(wi, currentWingmanInferenceItem)) {
                        setCurrentWingmanInferenceItem(wi);
                    }
                }
            }
            if (json?.DownloadItems) {
                if (!isEqual(json?.DownloadItems, downloadItems))
                    setDownloadItems(json.DownloadItems);
            }
            // const date = new Date();
            // setLastTime(date);
        }
    }, [lastMessage, pauseMetrics]);

    useEffect(() =>
    {
        // wingmanDispatch({ field: "alias", value: alias });
        // wingmanDispatch({ field: "modelRepo", value: modelRepo });
        // wingmanDispatch({ field: "filePath", value: filePath });
        // wingmanDispatch({ field: "isGenerating", value: isGenerating });
        // wingmanDispatch({ field: "latestItem", value: latestItem });
        // wingmanDispatch({ field: "items", value: items });
        wingmanDispatch({ field: "pauseMetrics", value: pauseMetrics });
        wingmanDispatch({ field: "timeSeries", value: timeSeries });
        wingmanDispatch({ field: "meta", value: meta });
        wingmanDispatch({ field: "tensors", value: tensors });
        wingmanDispatch({ field: "system", value: system });
        wingmanDispatch({ field: "metrics", value: metrics });
        // wingmanDispatch({ field: "lastTime", value: lastTime });
        wingmanDispatch({ field: "isOnline", value: isOnline });
        wingmanDispatch({ field: "status", value: connectionStatus });
        wingmanDispatch({ field: "wingmanServiceStatus", value: wingmanServiceStatus });
        wingmanDispatch({ field: "downloadServiceStatus", value: downloadServiceStatus });
        wingmanDispatch({ field: "wingmanItems", value: wingmanItems });
        wingmanDispatch({ field: "currentWingmanInferenceItem", value: currentWingmanInferenceItem });
        // wingmanDispatch({ field: "lastWebSocketMessage", value: lastMessage });

        // wingmanDispatch({ field: "forceChosenModel", value: forceChosenModel });
        // wingmanDispatch({ field: "activate", value: activate });
        // wingmanDispatch({ field: "deactivate", value: deactivate });
        // wingmanDispatch({ field: "startGenerating", value: startGenerating });
        // wingmanDispatch({ field: "stopGenerating", value: stopGenerating });
        // wingmanDispatch({ field: "toggleMetrics", value: toggleMetrics });

        // const wingmanItem = wingmanItems.find((item) => item.status === "inferring");
        // if (wingmanItem && isModelChosen() && wingmanItem.alias === chosenModel?.filePath){
        //     onInferenceItemsEvent(wingmanItem);
        // }
    }, [
        // isGenerating, latestItem, items,
        pauseMetrics, timeSeries, meta, system, tensors, metrics,
        // lastTime,
        isOnline, connectionStatus, wingmanServiceStatus,
        downloadServiceStatus,
        // lastMessage,
        currentWingmanInferenceItem]);

    // const { getWingmanItems } = useApiService();
    // const { data: currentWingmanItems, error: currentWingmanItemsError } = useQuery(
    //     "GetWingmanItems",
    //     getWingmanItems,
    //     { enabled: true, refetchIntervalInBackground: true, refetchInterval: 300 }
    // );

    // useEffect(() =>
    // {
    //     if (currentWingmanItems) {
    //         if (currentWingmanItems !== undefined && currentWingmanItems.length > 0) {
    //             setWingmanItems(currentWingmanItems);
    //             // search for the currentWinmanInferenceItem in the list of currentWingmanItems
    //             // if it's not there, check for the first item with an active status
    //             let wi = currentWingmanItems.find((wi) => wi.alias === currentWingmanInferenceItem?.alias);
    //             if (wi === undefined) {
    //                 wi = currentWingmanItems.find((wi) => hasActiveStatus(wi));
    //             }
    //             setCurrentWingmanInferenceItem(wi);
    //             // const wi = currentWingmanItems.find((wi) => hasActiveStatus(wi));
    //             // if (wi?.alias !== currentWingmanInferenceItem?.alias) {
    //             //     if (wi !== undefined) {
    //             //         setCurrentWingmanInferenceItem(wi);
    //             //     } else {
    //             //         setCurrentWingmanInferenceItem(undefined);
    //             //     }
    //             // }
    //         }
    //         // this is also being done in the useWingman hook using real-time updates
    //         // wingmanDispatch({ field: "wingmanItems", value: currentWingmanItems });
    //     }
    // }, [currentWingmanItems]);

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
        timeSeries, meta, system, tensors, metrics,
        // lastTime,
        wingmanServiceStatus, downloadServiceStatus,
        wingmanItems,
        downloadItems,
        currentWingmanInferenceItem,
        // lastWebSocketMessage,
    };
}
