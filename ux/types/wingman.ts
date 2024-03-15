import { ConnectionStatus, DownloadItem, DownloadServerAppItem as DownloadServiceAppItem } from "./download";
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
    wingmanStatusMessage: string;
    isInferring: boolean;
    isDownloading: boolean;
    inferringAlias: string;
    wingmanStatusLabel: string;
}

export const getWingmanItemStatusMessage = (wi: WingmanItem | undefined) =>
{
    if (wi !== undefined) {
        switch (wi.status) {
            case "queued":
                return "Mission Briefing"; // The item is queued and ready to start, like an aircraft taxiing to the runway for takeoff
            case "preparing":
                return "Final Checks"; // The item is in the final preparation stages, similar to an aircraft cleared for takeoff
            case "inferring":
                return "Engaged"; // The item is actively being processed, akin to a plane that has taken off and is in flight
            case "complete":
                return "Mission Complete"; // Signifies the successful completion of the task, like a plane safely landing
            case "error":
                return "Mission Compromised"; // Communicates a problem or error, as in distress signals
            case "cancelling":
                return "Mission Aborted"; // Indicates aborting the current task and returning, similar to a plane returning to base
            case "unknown":
                return "Mission Status Unknown"; // Reflects uncertainty or lack of information about the status
            default:
                throw new Error(`Unknown WingmanItem status: ${wi.status}`);
        }
    } else {
        return "No Mission";
    }
};

export const getWingmanItemStatusLabel = (wi: WingmanItem | undefined) =>
{
    if (wi !== undefined) {
        switch (wi.status) {
            case "queued":
                return "Briefing"; // The item is queued and ready to start, like an aircraft taxiing to the runway for takeoff
            case "preparing":
                return "Final"; // The item is in the final preparation stages, similar to an aircraft cleared for takeoff
            case "inferring":
                return "Engaged"; // The item is actively being processed, akin to a plane that has taken off and is in flight
            case "complete":
                return "Complete"; // Signifies the successful completion of the task, like a plane safely landing
            case "error":
                return "Compromised"; // Communicates a problem or error, as in distress signals
            case "cancelling":
                return "Aborted"; // Indicates aborting the current task and returning, similar to a plane returning to base
            case "unknown":
                return "Unknown"; // Reflects uncertainty or lack of information about the status
            default:
                throw new Error(`Unknown WingmanItem status: ${wi.status}`);
        }
    } else {
        return "Down";
    }
};

export const isValidWingmanItem = (item: WingmanItem) => item.alias !== undefined && item.alias.trim() !== "";
export const WINGMAN_TABLE = "wingman";

// TODO: move port config to the global context allowing for dynamic port assignment
export const WINGMAN_SERVER_DEFAULT_HOST = "127.0.0.1";
// export const WINGMAN_SERVER_DEFAULT_HOST = "192.168.0.55";
export const WINGMAN_INFERENCE_PORT = 6567;
export const WINGMAN_CONTROL_PORT = 6568;   // both http and websocket is handled by this port
export const WINGMAN_CONTROL_SERVER_URL = `http://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_CONTROL_PORT}`;
export const WINGMAN_INFERENCE_SERVER_URL = `http://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_INFERENCE_PORT}`;
