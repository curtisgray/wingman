import { ConnectionStatus, DownloadServerAppItem } from "@/types/download";
import { LlamaStats, LlamaStatsMeta, LlamaStatsSystem, LlamaStatsTensors, LlamaStatsTimings, newLlamaStatsMeta, newLlamaStatsSystem, newLlamaStatsTensors, newLlamaStatsTimings } from "@/types/llama_stats";
import { WingmanContent, WingmanItem, WingmanItemStatus, WingmanServerAppItem, createWingmanItem } from "@/types/wingman";

export interface WingmanInitialState
{
    alias: string;
    modelRepo: string;
    filePath: string;
    isGenerating: boolean;
    latestItem: WingmanContent | undefined;
    timeSeries: LlamaStats[];
    meta: LlamaStatsMeta;
    system: LlamaStatsSystem;
    tensors: LlamaStatsTensors;
    metrics: LlamaStatsTimings;
    lastTime: Date;
    isOnline: boolean;
    status: ConnectionStatus;
    wingmanServiceStatus: WingmanServerAppItem | undefined;
    downloadServiceStatus: DownloadServerAppItem | undefined;
    wingmanStatus: WingmanItemStatus;
    isInferring: boolean;
    wingmanItem: WingmanItem;

    forceChosenModel: (alias: string, modelRepo: string, filePath: string) => void;
    activate: (alias: string, modelRepo: string, filePath: string, gpuLayers: number) => Promise<WingmanItem | undefined>;
    deactivate: () => Promise<void>;
    startGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    stopGenerating: () => void;
    toggleMetrics: () => void;
}

export const initialWingmanState: WingmanInitialState = {
    alias: "",
    modelRepo: "",
    filePath: "",
    isGenerating: false,
    latestItem: undefined,
    timeSeries: [],
    meta: newLlamaStatsMeta(),
    system: newLlamaStatsSystem(),
    tensors: newLlamaStatsTensors(),
    metrics: newLlamaStatsTimings(),
    lastTime: new Date(),
    isOnline: false,
    status: "❓",
    wingmanServiceStatus: undefined,
    downloadServiceStatus: undefined,
    wingmanStatus: "unknown",
    isInferring: false,
    wingmanItem: createWingmanItem("", "", ""),

    forceChosenModel: () => { },
    activate: async () => { return new Promise(() => { }); },
    deactivate: async () => { return new Promise(() => { }); },
    startGenerating: async () => { return new Promise(() => { }); },
    stopGenerating: () => { },
    toggleMetrics: () => { },
};
