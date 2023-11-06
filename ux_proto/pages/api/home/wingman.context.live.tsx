/* eslint-disable @typescript-eslint/no-unused-vars */
import { Dispatch, createContext, useEffect, useRef, useState } from "react";
import { ActionType, useCreateReducer } from "@/hooks/useCreateReducer";
import { WingmanInitialState, initialWingmanState } from "./wingman.state";
import { ConnectionStatus } from "@/types/download";
import { WingmanContent, WingmanItem } from "@/types/wingman";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import useWebSocket, { ReadyState } from "react-use-websocket";

export interface WingmanContextProps
{
    state: WingmanInitialState;
    dispatch: Dispatch<ActionType<WingmanInitialState>>;

    forceChosenModel: (alias: string, modelRepo: string, filePath: string) => void;
    activate: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    deactivate: () => Promise<void>;
    startGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    stopGenerating: () => void;
    toggleMetrics: () => void;
}

const WingmanContext = createContext<WingmanContextProps>(undefined!);

function precisionRound(value: number, precision: number)
{
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}

// export function useWingman(inferencePort: number, monitorPort: number, onNewContent: (content: WingmanContent) => void = () => { }): WingmanProps;
function useWingmanContext(inferencePort: number, monitorPort: number)
{
    const contextValue = useCreateReducer<WingmanInitialState>({
        initialState: initialWingmanState,
    });
    const {
        state: {
            alias,
            modelRepo,
            filePath,
            // isGenerating,
            // latestItem,
            timeSeries,
            // meta,
            // system,
            // tensors,
            // metrics,
            // lastTime,
            // status,
            // wingmanServiceStatus,
            // downloadServiceStatus,
            // wingmanStatus,
            // isInferring,
            // wingmanItem,
            // isOnline,
        },
        dispatch,
        // forceChosenModel,
        // activate,
        // deactivate,
        // startGenerating,
        // stopGenerating,
        // toggleMetrics,
    } = contextValue;

    const fractionDigits = 1;
    const continueGenerating = useRef<boolean>(true);
    const startGenerating = async (content: string, probabilities_to_return?: number): Promise<void> =>
        new Promise<void>((resolve, reject) =>
        {
            dispatch({ field: "latestItem", value: undefined });
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
                        dispatch({ field: "isGenerating", value: true });
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
                            dispatch({ field: "latestItem", value: content });
                            text = "";
                        }
                        dispatch({ field: "isGenerating", value: false });
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
    const [pauseMetrics, setPauseMetrics] = useState<boolean>(false);

    const inferenceActions = useRequestInferenceAction();

    const forceChosenModel = (alias: string, modelRepo: string, filePath: string): void =>
    {
        dispatch({ field: "alias", value: alias });
        dispatch({ field: "modelRepo", value: modelRepo });
        dispatch({ field: "filePath", value: filePath });
    };

    const activate = async (alias: string, modelRepo: string, filePath: string, gpuLayers: number): Promise<WingmanItem | undefined> =>{
        forceChosenModel(alias, modelRepo, filePath);
        return inferenceActions.requestStartInference(alias, modelRepo, filePath, gpuLayers);
    };
    const deactivate = async (): Promise<void> => {
        if (alias === "") return Promise.reject("Alias is empty");
        if (modelRepo === "") return Promise.reject("ModelRepo is empty");
        if (filePath === "") return Promise.reject("FilePath is empty");
        dispatch({ field: "alias", value: "" });
        dispatch({ field: "modelRepo", value: "" });
        dispatch({ field: "filePath", value: "" });
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
            if (json.meta) {
                dispatch({ field: "meta", value: json.meta });
            }
            if (json.system) {
                dispatch({ field: "system", value: json.system });
            }
            if (json.tensors) {
                dispatch({ field: "tensors", value: json.tensors });
            }
            if (json.timings && !pauseMetrics) {
                const metrics = json.timings;
                Object.keys(metrics).forEach(function (key) { metrics[key] = precisionRound(metrics[key], fractionDigits); });
                dispatch({ field: "metrics", value: metrics });
                dispatch({ field: "timeSeries", value: [...timeSeries, metrics].slice(-100) });
            }
            if (json?.WingmanService) {
                dispatch({ field: "wingmanServiceStatus", value: json.WingmanService });
            }
            if (json?.DownloadService) {
                dispatch({ field: "downloadServiceStatus", value: json.DownloadService });
            }
            // return whichever wingman item is inferring
            if (json?.isa === "WingmanItem" && json?.alias === alias) {
                const item = json as WingmanItem;
                dispatch({ field: "wingmanStatus", value: item.status });
                dispatch({ field: "isInferring", value: item.status === "inferring" });
                dispatch({ field: "wingmanItem", value: item });
            }
            const date = new Date();
            dispatch({ field: "lastTime", value: date });
        }
    }, [lastMessage, pauseMetrics]);

    useEffect(() =>
    {
        dispatch({ field: "status", value: connectionStatus as ConnectionStatus });
        dispatch({ field: "isOnline", value: readyState === ReadyState.OPEN });
    }, [readyState]);

    // return {
    //     alias, modelRepo, filePath, forceChosenModel,
    //     status, isOnline,
    //     isGenerating,
    //     latestItem,
    //     activate, deactivate, startGenerating, stopGenerating,
    //     toggleMetrics: () => setPauseMetrics(!pauseMetrics),
    //     timeSeries, meta, system, tensors, metrics, lastTime,
    //     wingmanServerStatus: wingmanServiceStatus, downloadServerStatus: downloadServiceStatus,
    //     wingmanStatus, isInferring, wingmanItem
    // };
    return contextValue;
}


export default WingmanContext;
