/* eslint-disable react-hooks/exhaustive-deps */
import { ConnectionStatus, DownloadItem, DownloadItemStatus, DownloadServerAppItem } from "@/types/download";
import { LlamaStats, LlamaStatsTimings, newLlamaStatsTimings, LlamaStatsSystem, newLlamaStatsSystem, LlamaStatsMeta, newLlamaStatsMeta, LlamaStatsTensors, newLlamaStatsTensors } from "@/types/llama_stats";
import { WINGMAN_CONTROL_PORT, WINGMAN_SERVER_DEFAULT_HOST, WingmanItem, WingmanItemStatus, WingmanServiceAppItem, WingmanStateProps, getWingmanItemStatusLabel, getWingmanItemStatusMessage, hasActiveStatus, precisionRound } from "@/types/wingman";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { isEqual } from "lodash";

export function useWingman():
    {
        pauseMetrics: boolean;
        status: ConnectionStatus;
        isOnline: boolean;
        timeSeries: LlamaStats[]; meta: LlamaStatsMeta; system: LlamaStatsSystem; tensors: LlamaStatsTensors; metrics: LlamaStatsTimings;
        wingmanServiceStatus: WingmanServiceAppItem | undefined;
        downloadServiceStatus: DownloadServerAppItem | undefined;
        wingmanItems: WingmanItem[]; isInferring: boolean; isActiveStatus: boolean; inferringAlias: string;
        downloadItems: DownloadItem[]; isDownloading: boolean;
        currentWingmanInferenceItem: WingmanItem | undefined; wingmanStatusMessage: string; wingmanStatusLabel: string;

        hasReceivedWingmanItems: boolean;
    }
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
    const [currentWingmanInferenceItem, setCurrentWingmanInferenceItem] = useState<WingmanItem | undefined>(undefined);
    const [wingmanStatusMessage, setWingmanStatusMessage] = useState<string>("Checking...");
    const [wingmanStatusLabel, setWingmanStatusLabel] = useState<string>("N/A");
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [isInferring, setIsInferring] = useState<boolean>(false);
    const [isActiveStatus, setIsActiveStatus] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [inferringAlias, setInferringAlias] = useState<string>("");
    const [hasReceivedWingmanItems, setHasReceivedWingmanItems] = useState<boolean>(false);

    const {
        lastMessage,
        readyState,
    } = useWebSocket(`ws://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_CONTROL_PORT}`,
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

    const updateStatusMessage = (wi: WingmanItem | undefined) =>
    {
        setWingmanStatusMessage(getWingmanItemStatusMessage(wi));
    };

    const updateStatusLabel = (wi: WingmanItem | undefined) =>
    {
        setWingmanStatusLabel(getWingmanItemStatusLabel(wi));
    };

    const updateIsDownloading = () =>
    {
        const statuses: DownloadItemStatus[] = ["queued", "downloading"];
        if (downloadItems.length > 0 && downloadItems.some((d: DownloadItem) => statuses.includes(d.status))) {
            setIsDownloading(true);
        } else {
            setIsDownloading(false);
        }
    };

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
                if (json.WingmanItems.length === 0) {
                    setCurrentWingmanInferenceItem(undefined);
                    setWingmanItems([]);
                } else {
                    setWingmanItems(json.WingmanItems);
                }
                setHasReceivedWingmanItems(true);
            }
            if (json?.DownloadItems) {
                setDownloadItems(json.DownloadItems);
                updateIsDownloading();
            }
            if (json?.currentWingmanInferenceItem) {
                // currentWingmanInferenceItem could be an empty object. If it is, we should set it to undefined
                let wi = undefined;
                if (Object.keys(json.currentWingmanInferenceItem).length === 0) {
                    setCurrentWingmanInferenceItem(undefined);
                } else {
                    setCurrentWingmanInferenceItem(json.currentWingmanInferenceItem);
                    wi = json.currentWingmanInferenceItem;
                }
                updateStatusMessage(wi);
                updateStatusLabel(wi);
                if (wi && hasActiveStatus(wi)) {
                    setIsActiveStatus(true);
                } else {
                    setIsActiveStatus(false);
                }
                if (wi && wi.status === "inferring") {
                    setIsInferring(true);
                    setInferringAlias(wi.alias);
                } else {
                    setIsInferring(false);
                    setInferringAlias("");
                }
            }
        }
    }, [lastMessage, pauseMetrics]);

    useEffect(() =>
    {
        setStatus(connectionStatus as ConnectionStatus);
        const online = readyState === ReadyState.OPEN;
        if (!online) {
            setWingmanItems([]);
            setCurrentWingmanInferenceItem(undefined);
            setWingmanServiceStatus(undefined);
            setDownloadServiceStatus(undefined);
            setDownloadItems([]);
            updateIsDownloading();
            setWingmanStatusMessage("No connection");
            setWingmanStatusLabel("N/A");
            setIsInferring(false);
            setIsActiveStatus(false);
            setInferringAlias("");
            setHasReceivedWingmanItems(false);
        }
        setIsOnline(online);
    }, [readyState]);

    return {
        status, isOnline,
        pauseMetrics,
        timeSeries, meta, system, tensors, metrics,
        wingmanServiceStatus, downloadServiceStatus,
        wingmanItems, inferringAlias,
        downloadItems,
        currentWingmanInferenceItem, wingmanStatusMessage, wingmanStatusLabel, isInferring, isActiveStatus, isDownloading,

        hasReceivedWingmanItems,
    };
}
