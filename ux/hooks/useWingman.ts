/* eslint-disable react-hooks/exhaustive-deps */
import { ConnectionStatus, DownloadItem, DownloadServerAppItem } from "@/types/download";
import { LlamaStats, LlamaStatsTimings, newLlamaStatsTimings, LlamaStatsSystem, newLlamaStatsSystem, LlamaStatsMeta, newLlamaStatsMeta, LlamaStatsTensors, newLlamaStatsTensors } from "@/types/llama_stats";
import { GpuInfo, WINGMAN_CONTROL_PORT, WingmanItem, WingmanServiceAppItem, WingmanStateProps, hasActiveStatus } from "@/types/wingman";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { isEqual } from "lodash";


function precisionRound(value: number, precision: number)
{
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}

export function useWingman(): WingmanStateProps
{
    const fractionDigits = 1;
    const [status, setStatus] = useState<ConnectionStatus>("❓");
    const [timeSeries, setTimeSeries] = useState<LlamaStats[]>([]);
    const [meta, setMeta] = useState<LlamaStatsMeta>(() => newLlamaStatsMeta());
    const [system, setSystem] = useState<LlamaStatsSystem>(() => newLlamaStatsSystem());
    const [tensors, setTensors] = useState<LlamaStatsTensors>(() => newLlamaStatsTensors());
    const [metrics, setMetrics] = useState<LlamaStatsTimings>(() => newLlamaStatsTimings());
    const [pauseMetrics, setPauseMetrics] = useState<boolean>(false);
    const [downloadServiceStatus, setDownloadServiceStatus] = useState<DownloadServerAppItem | undefined>(undefined);
    const [wingmanServiceStatus, setWingmanServiceStatus] = useState<WingmanServiceAppItem | undefined>(undefined);
    const [wingmanItems, setWingmanItems] = useState<WingmanItem[]>([]);
    const [downloadItems, setDownloadItems] = useState<DownloadItem[]>([]);
    const [gpuInfo, setGpuInfo] = useState<GpuInfo|undefined>(undefined);
    const [currentWingmanInferenceItem, setCurrentWingmanInferenceItem] = useState<WingmanItem | undefined>(undefined);
    const [isOnline, setIsOnline] = useState<boolean>(false);

    const {
        lastMessage,
        readyState,
    } = useWebSocket(`ws://localhost:${WINGMAN_CONTROL_PORT}`,
        {
            shouldReconnect: (_closeEvent) => true,
            reconnectAttempts: 9999999,
            reconnectInterval: 1000,
        });
    const connectionStatus = {
        [ReadyState.CONNECTING]: "🔄",
        [ReadyState.OPEN]: "✅",
        [ReadyState.CLOSING]: "⏳",
        [ReadyState.CLOSED]: "❌",
        [ReadyState.UNINSTANTIATED]: "❓",
    }[readyState];

    useEffect(() =>
    {
        if (lastMessage?.data) {
            const json = JSON.parse(lastMessage.data);
            if (json?.meta) {
                if (!isEqual(json?.meta, meta))
                    setMeta(json.meta);
            }
            if (json?.system) {
                if (!isEqual(json?.system, system))
                    setSystem(json.system);
            }
            if (json?.tensors) {
                if (!isEqual(json?.tensors, tensors))
                    setTensors(json.tensors);
            }
            if (json?.timings && !pauseMetrics) {
                const metrics = json.timings;
                Object.keys(metrics).forEach(function (key) { metrics[key] = precisionRound(metrics[key], fractionDigits); });
                setMetrics(metrics);
                setTimeSeries([...timeSeries, metrics].slice(-100));
            }
            if (json?.WingmanService) {
                if (!isEqual(json?.WingmanService, wingmanServiceStatus))
                    setWingmanServiceStatus(json.WingmanService);
            }
            if (json?.DownloadService) {
                if (!isEqual(json?.DownloadService, downloadServiceStatus))
                    setDownloadServiceStatus(json.DownloadService);
            }
            if (json?.WingmanItems) {
                if (!isEqual(json?.WingmanItems, wingmanItems)) {
                    setWingmanItems(json.WingmanItems);
                    // let's try setting the current inference item to the one that is inferring
                    const wi = json.WingmanItems.find((w: WingmanItem) => hasActiveStatus(w));
                    if (wi !== undefined && !isEqual(wi, currentWingmanInferenceItem)) {
                        setCurrentWingmanInferenceItem(wi);
                    }
                }
            }
            if (json?.DownloadItems) {
                setDownloadItems(json.DownloadItems);
            }
            if (json?.GpuInfo) {
                if (!isEqual(json?.GpuInfo, gpuInfo))
                    setGpuInfo(json.GpuInfo);
            }
        }
    }, [lastMessage, pauseMetrics]);


    useEffect(() =>
    {
        setStatus(connectionStatus as ConnectionStatus);
        setIsOnline(readyState === ReadyState.OPEN);
    }, [readyState]);

    return {
        status, isOnline,
        pauseMetrics,
        timeSeries, meta, system, tensors, metrics,
        wingmanServiceStatus, downloadServiceStatus,
        wingmanItems,
        downloadItems,
        currentWingmanInferenceItem,
        gpuInfo,
    };
}
