import { ConnectionStatus, DownloadServerAppItem as DownloadServiceAppItem, WingmanWebSocketMessage } from "./download";
import { LlamaStats, LlamaStatsMeta, LlamaStatsSystem, LlamaStatsTensors, LlamaStatsTimings } from "./llama_stats";

export type WingmanServerAppItemStatus = "ready" | "starting" | "preparing" | "running" | "stopping" | "stopped" | "error" | "unknown";
export type WingmanServiceAppItem = {
    isa: "WingmanServerAppItem";
    status: WingmanServerAppItemStatus;
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
    status: WingmanItemStatus;
    modelRepo: string;
    filePath: string;
    force: boolean;
    error?: string;
    created: number;
    updated: number;
};
export const createWingmanItem = (alias: string, modelRepo:string, filePath: string, force: boolean = false): WingmanItem =>
{
    return {
        isa: "WingmanItem",
        alias: alias,
        modelRepo: modelRepo,
        filePath: filePath,
        force: force,
        status: "unknown",
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
    alias: string;
    modelRepo: string;
    filePath: string;
    isGenerating: boolean;
    latestItem: WingmanContent | undefined;
    items: WingmanContent[];
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
    wingmanStatus: WingmanItemStatus;
    isInferring: boolean;
    wingmanItem: WingmanItem;
    lastWebSocketMessage: WingmanWebSocketMessage;

    forceChosenModel: (alias: string, modelRepo: string, filePath: string) => void;
    activate: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    deactivate: () => Promise<void>;
    startGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    stopGenerating: () => void;
    toggleMetrics: () => void;
}

export const isValidWingmanItem = (item: WingmanItem) => item.alias !== undefined && item.alias.trim() !== "";
export const WINGMAN_TABLE = "wingman";
