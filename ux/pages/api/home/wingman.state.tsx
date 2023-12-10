import { newLlamaStatsMeta, newLlamaStatsSystem, newLlamaStatsTensors, newLlamaStatsTimings } from "@/types/llama_stats";
import { WingmanStateProps, createWingmanItem } from "@/types/wingman";

export const initialWingmanState: WingmanStateProps = {
    // alias: "",
    // modelRepo: "",
    // filePath: "",
    // isGenerating: false,
    // latestItem: undefined,
    // items: [],
    pauseMetrics: false,
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
    // wingmanStatus: "unknown",
    // isInferring: false,
    // wingmanItem: createWingmanItem("", "", ""),
    wingmanItems: [],
    currentWingmanInferenceItem: undefined,
    lastWebSocketMessage: {
        lastMessage: undefined,
        connectionStatus: "❓"
    },

    // forceChosenModel: () => { },
    // activate: async () => { return new Promise(() => { }); },
    // deactivate: async () => { return new Promise(() => { }); },
    // startGenerating: async () => { return new Promise(() => { }); },
    // stopGenerating: () => { },
    // toggleMetrics: () => { },
};
