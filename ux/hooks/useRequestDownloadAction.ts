import { DownloadItem } from "@/types/download";
import { WINGMAN_CONTROL_SERVER_URL } from "@/types/wingman";

interface DownloadActionProps
{
    requestDownload: (modelRepo: string, filePath: string) => Promise<DownloadItem | undefined>;
    requestCancelDownload: (modelRepo: string, filePath: string) => Promise<void>;
    requestResetDownload: (modelRepo: string, filePath: string) => Promise<void>;
    requestRedownload: (modelRepo: string, filePath: string) => Promise<void>;
}

export function useRequestDownloadAction(): DownloadActionProps
{
    const requestDownload = async (modelRepo: string, filePath: string): Promise<DownloadItem | undefined> =>
    {
        try {
            const url = `${WINGMAN_CONTROL_SERVER_URL}/api/downloads/enqueue?modelRepo=${encodeURI(modelRepo)}&filePath=${encodeURI(filePath)}`;
            const response = await fetch(url);
            let downloadItem: DownloadItem | undefined = undefined;
            // ensure response is valid and that JSON data is of type ProgressData
            if (response.ok) {
                if ((response.headers.get("content-type") ?? "") && ((response.headers.get("content-type")?.includes("application/json")) ?? false)) {
                    try {
                        const data = await response.json();
                        if (data) {
                            const item = data as DownloadItem;
                            downloadItem = item;
                        }
                    } catch (error) {
                        console.error("useRequestDownloadAction: requestDownload Failed to parse JSON:", error);
                    }
                } else {
                    console.error("useRequestDownloadAction: requestDownload Received non-JSON response:",
                        response.headers.get("content-type"));
                }
            }
            return downloadItem;
        } catch (error) {
            console.error("useRequestDownloadAction: requestDownload Failed to start download:", error);
            return undefined;
        }
    };

    const requestCancelDownload = async (modelRepo: string, filePath: string) =>
    {
        const url = `${WINGMAN_CONTROL_SERVER_URL}/api/downloads/cancel?modelRepo=${modelRepo}&filePath=${filePath}`;
        try {
            const response = await fetch(encodeURI(url));
            if (!response.ok) {
                console.error("useRequestDownloadAction: requestCancelDownload Received non-OK response:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("useRequestDownloadAction: requestCancelDownload Exception Failed to cancel download:", error);
        }
    };

    const requestResetDownload = async (modelRepo: string, filePath: string) =>
    {
        const url = `${WINGMAN_CONTROL_SERVER_URL}/api/downloads/reset?modelRepo=${modelRepo}&filePath=${filePath}`;
        try {
            const response = await fetch(encodeURI(url));
            if (!response.ok) {
                console.error("useRequestDownloadAction: requestResetDownload Received non-OK response:", response.status, response.statusText);
            }
        } catch (error) {
            console.error("useRequestDownloadAction: requestResetDownload Exception Failed to cancel download:", error);
        }
    };

    const requestRedownload = async (modelRepo: string, filePath: string) =>
    {
        const url = `${WINGMAN_CONTROL_SERVER_URL}/api/downloads/reset?modelRepo=${modelRepo}&filePath=${filePath}`;
        try {
            const response = await fetch(encodeURI(url));
            if (!response.ok) {
                console.error("useRequestDownloadAction: requestRedownload Received non-OK response:", response.status, response.statusText);
            }
            await requestDownload(modelRepo, filePath);
        } catch (error) {
            console.error("useRequestDownloadAction: requestRedownload Exception Failed to cancel download:", error);
        }
    };

    return {
        requestDownload,
        requestCancelDownload,
        requestResetDownload,
        requestRedownload,
    };
}
