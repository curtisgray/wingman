import { ConnectionStatus, DownloadServerAppItem as DownloadServiceAppItem, WingmanWebSocketMessage } from "./download";
import { LlamaStats, LlamaStatsMeta, LlamaStatsSystem, LlamaStatsTensors, LlamaStatsTimings } from "./llama_stats";

export type WingmanServiceAppItemStatus = "ready" | "starting" | "preparing" | "inferring" | "stopping" | "stopped" | "error" | "unknown";
export type WingmanServiceAppItem = {
    isa: "WingmanServiceAppItem";
    status: WingmanServiceAppItemStatus;
    alias: string;
    modelRepo: string;
    filePath: string;
    error?: string;
    created: number;
    updated: number;
};
export type WingmanItemStatus = "queued" | "preparing" | "inferring" | "complete" | "error" | "cancelling" | "cancelled" | "unknown";
export type WingmanProps = {
    alias: string;
};
export type WingmanItem = WingmanProps & {
    isa: "WingmanItem";
    alias: string;
    status: WingmanItemStatus;
    modelRepo: string;
    filePath: string;
    address: string;
    port: number;
    contextSize: number;
    gpuLayers: number;
    force: boolean;
    error?: string;
    created: number;
    updated: number;
};

// convert from c++ to js
// static bool hasActiveStatus(const WingmanItem& item)
// {
//     switch (item.status) {
//         case WingmanItemStatus:: queued:
// 				case WingmanItemStatus:: preparing:
// 				case WingmanItemStatus:: inferring:
// 				case WingmanItemStatus:: cancelling:
//             return true;
//         default:
//             return false;
//     }
// }
export const hasActiveStatus = (item: WingmanItem) =>
{
    switch (item.status) {
        case "queued":
        case "preparing":
        case "inferring":
        case "cancelling":
            return true;
        default:
            return false;
    }
};

// convert from c++ to js
// check a list of Wingman items to see if any of them have an active status
// static bool hasActiveStatus(const std:: vector<WingmanItem>& items)
// {
//     for (const auto& item : items) {
//         if (!hasActiveStatus(item)) {
//             return false;
//         }
//     }
//     return true;
// }
export const hasActiveStatusList = (items: WingmanItem[]) =>
{
    for (const item of items) {
        if (!hasActiveStatus(item)) {
            return false;
        }
    }
    return true;
};

// completed status
// static bool hasCompletedStatus(const WingmanItem& item)
// {
//     switch (item.status) {
//         case WingmanItemStatus:: complete:
// 				case WingmanItemStatus:: error:
// 				case WingmanItemStatus:: cancelled:
//             return true;
//         default:
//             return false;
//     }
// }
export const hasCompletedStatus = (item: WingmanItem) =>
{
    switch (item.status) {
        case "complete":
        case "error":
        case "cancelled":
            return true;
        default:
            return false;
    }
};

// static bool hasCompletedStatus(const std:: vector<WingmanItem>& items)
// {
//     for (const auto& item : items) {
//         if (!hasCompletedStatus(item)) {
//             return false;
//         }
//     }
//     return true;
// }
export const hasCompletedStatusList = (items: WingmanItem[]) =>
{
    for (const item of items) {
        if (!hasCompletedStatus(item)) {
            return false;
        }
    }
    return true;
};

export const createWingmanItem = (alias: string, modelRepo:string, filePath: string, force: boolean = false): WingmanItem =>
{
    return {
        isa: "WingmanItem",
        alias: alias,
        status: "unknown",
        modelRepo: modelRepo,
        filePath: filePath,
        force: force,
        created: Date.now(),
        updated: Date.now()
    } as WingmanItem;
};
export type WingmanContent = {
    isa: "WingmanContent";
    content: string;
    model: string;
    stop: boolean;
    timestamp: number;
    completion_probabilities?: [
        {
            content: string;
            probs: [
                {
                    prob: number;
                    tok_str:string;
                }
            ];
        }
    ];
};
export interface WingmanStateProps
{
    // alias: string;
    // modelRepo: string;
    // filePath: string;
    // isGenerating: boolean;
    // latestItem: WingmanContent | undefined;
    // items: WingmanContent[];
    pauseMetrics: boolean;
    timeSeries: LlamaStats[];
    meta: LlamaStatsMeta;
    system: LlamaStatsSystem;
    tensors: LlamaStatsTensors;
    metrics: LlamaStatsTimings;
    lastTime: Date;
    isOnline: boolean;
    status: ConnectionStatus;
    wingmanServiceStatus: WingmanServiceAppItem | undefined;
    downloadServiceStatus: DownloadServiceAppItem | undefined;
    // wingmanStatus: WingmanItemStatus;
    // isInferring: boolean;
    // wingmanItem: WingmanItem;
    wingmanItems: WingmanItem[];
    currentWingmanInferenceItem: WingmanItem | undefined;
    lastWebSocketMessage: WingmanWebSocketMessage;

    // forceChosenModel: (alias: string, modelRepo: string, filePath: string) => void;
    // activate: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    // deactivate: () => Promise<void>;

    // startGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    // stopGenerating: () => void;
    // toggleMetrics: () => void;
}

export const isValidWingmanItem = (item: WingmanItem) => item.alias !== undefined && item.alias.trim() !== "";
export const WINGMAN_TABLE = "wingman";
