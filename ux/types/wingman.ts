import { ConnectionStatus, DownloadItem, DownloadServerAppItem as DownloadServiceAppItem, WingmanWebSocketMessage } from "./download";
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
export type WingmanItemStatus = "queued" | "preparing" | "inferring" | "complete" | "error" | "cancelling" | "unknown";
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

export const hasActiveStatusList = (items: WingmanItem[]) =>
{
    for (const item of items) {
        if (!hasActiveStatus(item)) {
            return false;
        }
    }
    return true;
};

export const hasCompletedStatus = (item: WingmanItem) =>
{
    switch (item.status) {
        case "complete":
        case "error":
            return true;
        default:
            return false;
    }
};

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
    pauseMetrics: boolean;
    timeSeries: LlamaStats[];
    meta: LlamaStatsMeta;
    system: LlamaStatsSystem;
    tensors: LlamaStatsTensors;
    metrics: LlamaStatsTimings;
    // lastTime: Date;
    isOnline: boolean;
    status: ConnectionStatus;
    wingmanServiceStatus: WingmanServiceAppItem | undefined;
    downloadServiceStatus: DownloadServiceAppItem | undefined;
    wingmanItems: WingmanItem[];
    downloadItems: DownloadItem[];
    currentWingmanInferenceItem: WingmanItem | undefined;
}

export const isValidWingmanItem = (item: WingmanItem) => item.alias !== undefined && item.alias.trim() !== "";
export const WINGMAN_TABLE = "wingman";

// TODO: move port config to the global context allowing for dynamic port assignment
export const WINGMAN_INFERENCE_PORT = 6567;
export const WINGMAN_CONTROL_PORT = 6568;   // both http and websocket is handled by this port
export const WINGMAN_CONTROL_SERVER_URL = `http://localhost:${WINGMAN_CONTROL_PORT}`;
export const WINGMAN_INFERENCE_SERVER_URL = `http://127.0.0.1:${WINGMAN_INFERENCE_PORT}`;
