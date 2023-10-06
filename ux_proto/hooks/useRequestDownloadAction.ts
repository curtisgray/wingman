import { useDownloadServer } from "./useDownloadServer";
import { DownloadItem, DownloadedFileInfo } from "@/types/download";

interface DownloadActionProps
{
    requestDownload: (modelRepo: string, filePath: string) => Promise<DownloadItem | undefined>;
    requestCancelDownload: (modelRepo: string, filePath: string) => Promise<void>;
    requestResetDownload: (modelRepo: string, filePath: string) => Promise<void>;
    requestRedownload: (modelRepo: string, filePath: string) => Promise<void>;
    getDownloadedFileInfo: (modelRepo: string, filePath: string) => Promise<DownloadedFileInfo | undefined>;
}

export function useRequestDownloadAction(): DownloadActionProps
{
    // const { state: { isOnline } } = useContext(HomeContext);
    const downloadServer = useDownloadServer();

    const requestDownload = async (modelRepo: string, filePath: string): Promise<DownloadItem | undefined> =>
    {
        if (!downloadServer.isOnline) {
            console.error("useRequestDownloadAction: requestDownload Not online");
            return undefined;
        }
        try {
            const response = await fetch(encodeURI(`/api/download?modelRepo=${modelRepo}&filePath=${filePath}`));
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
        if (!downloadServer.isOnline) {
            console.error("useRequestDownloadAction: requestCancelDownload Not online");
            return;
        }
        const url = `/api/download?cancel=true&modelRepo=${modelRepo}&filePath=${filePath}`;
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
        if (!downloadServer.isOnline) {
            console.error("useRequestDownloadAction: requestResetDownload Not online");
            return;
        }
        const url = `/api/download?reset=true&modelRepo=${modelRepo}&filePath=${filePath}`;
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
        if (!downloadServer.isOnline) {
            console.error("useRequestDownloadAction: requestRedownload Not online");
            return;
        }
        const url = `/api/download?reset=true&modelRepo=${modelRepo}&filePath=${filePath}`;
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

    const getDownloadedFileInfo = async (modelRepo: string, filePath: string): Promise<DownloadedFileInfo | undefined> =>
    {
        if (!downloadServer.isOnline) {
            console.error("useRequestDownloadAction: getDownloadedFileInfo Not online");
            return undefined;
        }

        try {
            const response = await fetch(encodeURI(`/api/download?info&modelRepo=${modelRepo}&filePath=${filePath}`));
            let downloadInfo: DownloadedFileInfo | undefined = undefined;
            // ensure response is valid and that JSON data is of type DownloadedFileInfo
            if (response.ok) {
                if ((response.headers.get("content-type") ?? "") && ((response.headers.get("content-type")?.includes("application/json")) ?? false)) {
                    try {
                        const data = await response.json();
                        if (data) {
                            const item = data as DownloadedFileInfo;
                            downloadInfo = item;
                        }
                    } catch (error) {
                        console.error("useRequestDownloadAction: getDownloadedFileInfo Failed to parse JSON:", error);
                    }
                } else {
                    console.error("useRequestDownloadAction: getDownloadedFileInfo Received non-JSON response:",
                        response.headers.get("content-type"));
                }
            }
            return downloadInfo;
        } catch (error) {
            console.error("useRequestDownloadAction: getDownloadedFileInfo Failed to start download:", error);
            return undefined;
        }
    };

    return {
        requestDownload,
        requestCancelDownload,
        requestResetDownload,
        requestRedownload,
        getDownloadedFileInfo,
    };
}
