import { ChildProcess } from "child_process";
import path from "path";
import os from "os";

export type ConnectionStatus = "❓" | "🔄" | "✅" | "⏳" | "❌";
export type DownloadServerAppItemStatus = "ready" | "starting" | "preparing" | "downloading" | "stopping" | "stopped" | "error" | "unknown";
export type DownloadServerAppItem = {
    isa: "DownloadServerAppItem";
    status: DownloadServerAppItemStatus;
    currentDownload?: DownloadItem;
    error?: string;
    created: number;
    updated: number;
};
// - idle - download is available to be queued
// - queued - download is queued, and next in line to be downloaded
// - downloading - download is in progress
// - complete - download is complete
// - error - download failed, and will not be considered until it is reset to idle
// - cancelled - download was cancelled, and will not be considered until it is reset to idle
// - unknown - download is in an unknown state, and will not be considered until it is reset to idle
export type DownloadItemStatus = "idle" | "queued" | "downloading" | "complete" | "error" | "cancelled" | "unknown";
export const ActiveDownloadItemStatuses = ["queued", "downloading"];
export type DownloadProps = {
    modelRepo: string;
    filePath: string;
};
export type DownloadItem = DownloadProps & {
    isa: "DownloadItem";
    status: DownloadItemStatus;
    totalBytes?: number;
    downloadedBytes?: number;
    downloadSpeed?: string;
    progress: number;
    error?: string;
    created: number;
    updated: number;
};

export type DownloadButtonProps = DownloadProps & {
    className?: string;
    disabled?: boolean;
    showRepoName?: boolean;
    showFileName?: boolean;
    showProgress?: boolean;
    showProgressText?: boolean;
    hideIfDisabled?: boolean;
    onComplete?: (item: DownloadItem) => void;
    onStarted?: (item: DownloadItem) => void;
    onCancelled?: (item: DownloadItem) => void;
    onProgress?: (value: number) => void;
    autoActivate?: boolean;
    children?: React.ReactNode;
};

export const isValidDownloadItem = (item: DownloadItem) => item.modelRepo && item.filePath;
export type WingmanWebSocket = {
    lastMessage: string | undefined;
    connectionStatus: ConnectionStatus;
};
export type DownloadMetricsProps = DownloadProps & {
    refreshInterval?: number;
    showRepoName?: boolean;
    showFileName?: boolean;
    showStatus?: boolean;
    showProgress?: boolean;
    showProgressText?: boolean;
    noDownloadMessage?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
};
export type StartDownloadProps = DownloadProps & {
    destination: string;
};
export const createDownloadItem = (modelRepo: string, filePath: string): DownloadItem =>
{
    return {
        modelRepo: modelRepo,
        filePath: filePath,
        status: "idle",
        progress: 0,
        created: Date.now(),
        updated: Date.now()
    } as DownloadItem;
};
export type DownloadedFileInfo = {
    modelRepo: string;
    filePath: string;
    status: DownloadItemStatus;
    totalBytes: number;
    downloadedBytes: number;
    fileNameOnDisk: string;
    fileSizeOnDisk: number;
    filePathOnDisk: string;
    created: number;
    updated: number;
};
export const createDownloadedFile = (modelRepo: string, filePath: string): DownloadedFileInfo =>
{
    return {
        modelRepo: modelRepo,
        filePath: filePath,
        status: "unknown",
        totalBytes: 0,
        downloadedBytes: 0,
        fileNameOnDisk: "",
        fileSizeOnDisk: 0,
        filePathOnDisk: "",
        created: EPOCH,
        updated: EPOCH
    } as DownloadedFileInfo;
};
export const safeDownloadItemName = (modelRepo: string, filePath: string) =>
    `${modelRepo.replace(/\//gi, "[-]")}[=]${filePath}`;
export const safeDownloadItemNameToModelRepo = (name: string): DownloadProps | undefined =>
{
    if (!name.includes("[-]") || !name.includes("[=]")) return undefined;

    const split = name.split("[=]");
    const modelRepo = split[0].replace(/\[-\]/gi, "/");
    const filePath = split[1];
    return { modelRepo: modelRepo, filePath: filePath };
};

// Utility function to get the filepath for a specific modelRepo and filePath
export const getDownloadItemFilePath = (modelRepo: string, filePath: string): string =>
{
    return path.join(MODELS_DIR, safeDownloadItemName(modelRepo, filePath));
};

export type AppItem = {
    isa: "AppItem";
    name: string;
    key: string;
    value?: string;
    created: number;
    updated: number;
};
export const isValidAppItem = (item: AppItem) => item.name;
export const createAppItem = (name: string, key: string = "default"): AppItem =>
{
    return {
        name: name,
        key: key,
        created: Date.now(),
        updated: Date.now()
    } as AppItem;
};

export type ChildProcessesMap = {
    [serverName: string]: {
        child: ChildProcess,
        startTime: number;
        controller: AbortController;
    };
};

export const DIST_LEAF_DIR = "dist";
export const DATA_LEAF_DIR = "data";
export const MODELS_LEAF_DIR = "models";

export const DATA_DIR = path.join(os.homedir(), ".wingman", DATA_LEAF_DIR);
export const MODELS_DIR = path.join(DATA_DIR, MODELS_LEAF_DIR);

export const DATABASE_FILENAME = "wingman.db";
export const DOWNLOADS_TABLE = "downloads";
export const APP_TABLE = "app";

export const EPOCH = (new Date(0)).getTime(); // get epoch as a number
