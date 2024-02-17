import { ReactNode } from "react";
import { ChildProcess } from "child_process";
import path from "path";
import os from "os";
import { HF_MODEL_ENDS_WITH, HF_MODEL_FILE_EXTENSION } from "@/utils/app/const";

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
    onInitialized?: (success: boolean) => void;
    autoStart?: boolean;
    children?: ReactNode;
};

export const isValidDownloadItem = (item: DownloadItem) => item.modelRepo && item.filePath;
export type WingmanWebSocketMessage = {
    lastMessage: string | undefined;
    connectionStatus: ConnectionStatus;
};
export const newWingmanWebSocketMessage = (): WingmanWebSocketMessage =>
{   
    return {
        lastMessage: undefined,
        connectionStatus: "❓"
    } as WingmanWebSocketMessage;
};
export type DownloadMetricsProps = DownloadProps & {
    refreshInterval?: number;
    showRepoName?: boolean;
    showFileName?: boolean;
    showStatus?: boolean;
    showProgress?: boolean;
    showProgressText?: boolean;
    noDownloadMessage?: ReactNode;
    className?: string;
    children?: ReactNode;
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

export const UnstripFormatFromModelRepo = (modelRepo: string): string =>
{
    if (!modelRepo) throw new Error("modelRepo is required, but is empty");
    if (modelRepo.endsWith(HF_MODEL_ENDS_WITH)) return modelRepo;
    return modelRepo + HF_MODEL_ENDS_WITH;
};

export const StripFormatFromModelRepo = (modelRepo: string): string =>
{
    if (!modelRepo) throw new Error("modelRepo is required, but is empty");
    let modelRepoStripped = modelRepo;
    if (modelRepo.endsWith(HF_MODEL_ENDS_WITH)) {
        modelRepoStripped = modelRepo.substr(0, modelRepo.length - HF_MODEL_ENDS_WITH.length);
    }
    // check if the modelRepo has a '/' in it
    if (modelRepoStripped.includes("/")) {
        const [owner, repo] = modelRepoStripped.split('/');
        modelRepoStripped = `${repo}`;
    }
    const cleanName = modelRepoStripped.replace(/-/g, ' ');
    return cleanName;
};

export const quantizationNameFromQuantization = (quantization: string): string =>
{
    let quantizationName = "";
    for (let i = 1; i < quantization.length; i++)
    {
        if (quantization[i] === "_")
        {
            if (i + 1 < quantization.length && !isNaN(parseInt(quantization[i + 1])))
            {
                quantizationName += ".";
            }
            else
            {
                quantizationName += " ";
            }
        }
        else
        {
            quantizationName += quantization[i];
        }
    }
    return quantizationName;
};

export type Quantization = {
    isa: "Quantization";
    quantization: string;
    quantizationName: string;
}

export const quantizationFromFilePath = (filePath: string): Quantization =>
{
    const parts = filePath.split(".");
    let quantPosition = 1;
    const ext = HF_MODEL_FILE_EXTENSION.slice(1);
    if (parts[parts.length - 1] === ext)
    {
        quantPosition = 2;
    }
    const q = parts[parts.length - quantPosition];
    const quantization = quantizationNameFromQuantization(q);
    return {
        isa: "Quantization",
        quantization: quantization,
        quantizationName: quantization
    } as Quantization;
};

export const prettyBytes = (bytes: number): string =>
{
    if (bytes < 1024)
        return bytes + " B";

    const suffixes: string[] = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let s: number = 0; // which suffix to use
    let count: number = bytes;
    while (count >= 1024 && s < suffixes.length - 1) {
        s++;
        count /= 1024;
    }
    return count.toFixed(1) + " " + suffixes[s];
}

export const timeAgo = (date: Date): string =>
{
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const DAY_IN_MS = 86400000; // 24 * 60 * 60 * 1000
    const days = Math.floor((today.getTime() - dateObj.getTime()) / DAY_IN_MS);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const isToday = today.toDateString() === dateObj.toDateString();
    const isYesterday = new Date(today.getTime() - DAY_IN_MS).toDateString() === dateObj.toDateString();

    if (days === 0) {
        return 'today';
    } else if (days === 1 && isYesterday) {
        return 'yesterday' ;
    } else if (days < 7) {
        return `${days} days ago`;
    } else if (weeks < 4) {
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (months < 3) {
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        return dateObj.toLocaleDateString(); // Display in local format
    }
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
