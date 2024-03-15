import { newLlamaStatsMeta, newLlamaStatsSystem, newLlamaStatsTensors, newLlamaStatsTimings } from "@/types/llama_stats";
import { WingmanStateProps } from "@/types/wingman";

export const initialWingmanState: WingmanStateProps = {
    pauseMetrics: false,
    timeSeries: [],
    meta: newLlamaStatsMeta(),
    system: newLlamaStatsSystem(),
    tensors: newLlamaStatsTensors(),
    metrics: newLlamaStatsTimings(),
    // lastTime: new Date(),
    isOnline: false,
    status: "❓",
    wingmanServiceStatus: undefined,
    downloadServiceStatus: undefined,
    wingmanItems: [],
    downloadItems: [],
    currentWingmanInferenceItem: undefined,
    wingmanStatusMessage: "Unknown status",
    isInferring: false,
    isDownloading: false,
    inferringAlias: "",
    wingmanStatusLabel: "Unknown",
};
