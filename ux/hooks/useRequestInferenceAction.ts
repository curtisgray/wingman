import { WINGMAN_SERVER_API } from "@/types/ai";
import { WingmanItem } from "@/types/wingman";

interface InferenceActionProps
{
    requestStartInference: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    requestStopInference: (alias: string) => Promise<void>;
    // requestRestartInference: (alias: string) => Promise<void>;
}

export function useRequestInferenceAction(): InferenceActionProps
{
    const requestStartInference = async (alias: string, modelRepo: string, filePath: string, gpuLayers: number = -1): Promise<WingmanItem | undefined> =>
    {
        try {
            const url = `${WINGMAN_SERVER_API}/inference/start?alias=${encodeURI(alias)}&modelRepo=${encodeURI(modelRepo)}&filePath=${encodeURI(filePath)}&gpuLayers=${gpuLayers}`;
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
                        console.error("useRequestDownloadAction: requestDownload Failed to parse JSON:", error);
                    }
                } else {
                    console.error("useRequestDownloadAction: requestDownload Received non-JSON response:",
                        response.headers.get("content-type"));
                }
            }
            return wingmanItem;
        } catch (error) {
            console.error("useRequestDownloadAction: requestDownload Failed to start download:", error);
            return undefined;
        }
    };

    const requestStopInference = async (alias: string) =>
    {
        const url = `${WINGMAN_SERVER_API}/inference/stop?alias=${encodeURI(alias)}`;
        try {
            const response = await fetch(encodeURI(url));
            if (!response.ok) {
                console.error("useRequestDownloadAction: requestCancelDownload Received non-OK response:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("useRequestDownloadAction: requestCancelDownload Exception Failed to cancel download:", error);
        }
    };

    // const requestRestartInference = async (alias: string) =>
    // {
    //     try {
    //         await requestStopInference(alias);
    //         await requestStartInference(alias);
    //     } catch (error) {
    //         console.error("useRequestDownloadAction: requestRedownload Exception Failed to cancel download:", error);
    //     }
    // };

    return {
        requestStartInference,
        requestStopInference,
        // requestRestartInference,
    };
}
