import { WINGMAN_INFERENCE_SERVER_URL, WINGMAN_CONTROL_SERVER_URL, WingmanContent, WingmanItem } from "@/types/wingman";
import { useRef, useState } from "react";

interface InferenceActionProps
{
    requestStartInference: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    requestStopInference: (alias: string) => Promise<void>;
    startGenerating: (content: string, probabilities_to_return?: number) => Promise<void>;
    stopGenerating: () => void;
    latestGeneratedItem: WingmanContent | undefined;
    generatedItems: WingmanContent[];
    isGenerating: boolean;
}

export function useRequestInferenceAction(): InferenceActionProps
{
    const requestStartInference = async (alias: string, modelRepo: string, filePath: string, gpuLayers: number = -1): Promise<WingmanItem | undefined> =>
    {
        try {
            const url = `${WINGMAN_CONTROL_SERVER_URL}/api/inference/start?alias=${encodeURI(alias)}&modelRepo=${encodeURI(modelRepo)}&filePath=${encodeURI(filePath)}&gpuLayers=${gpuLayers}`;
            const response = await fetch(url);
            let wingmanItem: WingmanItem | undefined = undefined;
            // ensure response is valid and that JSON data is of type ProgressData
            if (response.ok) {
                if ((response.headers.get("content-type") ?? "") && ((response.headers.get("content-type")?.includes("application/json")) ?? false)) {
                    try {
                        const data = await response.json();
                        if (data) {
                            const item = data as WingmanItem;
                            wingmanItem = item;
                        }
                    } catch (error) {
                        console.error("useRequestInferenceAction: requestStartInference Failed to parse JSON:", error);
                    }
                } else {
                    console.error("useRequestInferenceAction: requestStartInference Received non-JSON response:",
                        response.headers.get("content-type"));
                }
            }
            return wingmanItem;
        } catch (error) {
            console.error("useRequestInferenceAction: requestStartInference Failed to start inference:", error);
            return undefined;
        }
    };

    const requestStopInference = async (alias: string) =>
    {
        const url = `${WINGMAN_CONTROL_SERVER_URL}/api/inference/stop?alias=${encodeURI(alias)}`;
        try {
            const response = await fetch(encodeURI(url));
            if (!response.ok) {
                console.error("useRequestInferenceAction: requestStopInference Received non-OK response:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("useRequestInferenceAction: requestStopInference Exception Failed to cancel inference:", error);
        }
    };

    const requestInferenceStatus = async (alias: string|undefined = undefined) =>
    {
        let url = `${WINGMAN_CONTROL_SERVER_URL}/api/inference/status`;
        if (alias) {
            url = `${WINGMAN_CONTROL_SERVER_URL}/api/inference/status?alias=${encodeURI(alias)}`;
        }
        try {
            const response = await fetch(encodeURI(url));
            if (!response.ok) {
                console.error("requestInferenceStatus: requestInferenceStatus Received non-OK response:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("requestInferenceStatus: requestInferenceStatus Exception Failed to cancel inference:", error);
        }
    };

    const continueGenerating = useRef<boolean>(true);
    const [latestGeneratedItem, setLatestItem] = useState<WingmanContent>();
    const [generatedItems, setItems] = useState<WingmanContent[]>([]);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    const startGenerating = async (content: string, probabilities_to_return?: number): Promise<void> =>
        new Promise<void>((resolve, reject) =>
        {
            setLatestItem(undefined);
            setItems([]);
            try {
                const controller = new AbortController();
                fetch(encodeURI(`${WINGMAN_INFERENCE_SERVER_URL}/completion`), {
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

    return {
        requestStartInference,
        requestStopInference,
        startGenerating,
        stopGenerating,
        latestGeneratedItem,
        generatedItems,
        isGenerating
    };
}
