import { DownloadServerAppItem } from "@/types/download";
import { WingmanItem, WingmanItemStatus, WingmanServerAppItem } from "@/types/wingman";
import { LlamaStats, LlamaStatsTimings, LlamaStatsSystem, LlamaStatsMeta, newLlamaStatsTimings, newLlamaStatsSystem, newLlamaStatsMeta } from "@/types/llama_stats";
import React, { useState, useEffect, ReactNode } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { LineChart, Line, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

function precisionRound(value: number, precision: number)
{
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
}

interface WingmanChartProps
{
    className?: string;
}

const WingmanChart = ({ className = "" }: WingmanChartProps) =>
{
    const fractionDigits = 1;
    const chartColors = {
        "predicted_per_second": "text-[#34a2fa]",
        "predicted_per_token_ms": "text-[#ffc658]",
        "sample_per_second": "text-[#fa34a3]",
        "sample_per_token_ms": "text-[#999999]",
        "model_name": "text-violet-400",
        "model_alias": "text-violet-400",
        "context_length": "text-lime-600",
        "vram_used": "text-lime-600",
        "offloaded": "text-lime-600",
        "offloaded_total": "text-gray-500",
    };
    const [timeSeries, setTimeSeries] = useState<LlamaStats[]>([]);
    const [metrics, setMetrics] = useState<LlamaStatsTimings>(() => newLlamaStatsTimings());
    const [system, setSystem] = useState<LlamaStatsSystem>(() => newLlamaStatsSystem());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [meta, setMeta] = useState<LlamaStatsMeta>(() => newLlamaStatsMeta());
    const [lastTime, setLastTime] = useState<Date>(new Date());
    const [pauseMetrics, setPauseMetrics] = useState<boolean>(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [downloadServiceStatus, setDownloadServiceStatus] = useState<DownloadServerAppItem|undefined>(undefined);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [wingmanServiceStatus, setWingmanServiceStatus] = useState<WingmanServerAppItem|undefined>(undefined);
    const [wingmanStatus, setWingmanStatus] = useState<WingmanItemStatus>("unknown");
    const [isInferring, setIsInferring] = useState<boolean>(false);
    const {
        lastMessage,
        readyState,
    } = useWebSocket("ws://localhost:6568",
        {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            if (json.system) {
                setSystem(json.system);
            }
            if (json.meta) {
                setMeta(json.meta);
            }
            if (json.timings && json.system?.has_next_token && !pauseMetrics) {
                const metrics = json.timings;
                Object.keys(metrics).forEach(function (key) { metrics[key] = precisionRound(metrics[key], fractionDigits); });
                setMetrics(metrics);
                setTimeSeries([...timeSeries, metrics].slice(-1000));
            }
            if (json?.WingmanService) {
                setWingmanServiceStatus(json.WingmanService);
            }
            if (json?.DownloadService) {
                setDownloadServiceStatus(json.DownloadService);
            }
            if (json?.isa === "WingmanItem") {
                const item = json as WingmanItem;
                setWingmanStatus(item.status);
                setIsInferring(item.status === "inferring");
            }

            const date = new Date();
            setLastTime(date);
        }
    }, [timeSeries, lastMessage, pauseMetrics]);

    const renderStat = (value: number|string, name: string, statColor: string): ReactNode =>
    {
        return (
            <div className="flex flex-col rounded shadow-lg bg-slate-700 m-2 p-2 items-center">
                <p className={`${statColor} text-xl`}>{value?.toLocaleString(undefined, { minimumFractionDigits: fractionDigits })}</p>
                <p className="font-semibold">{name}</p>
            </div>
        );
    };

    const renderOfflineHeader = (): ReactNode =>
    {
        //🔄
        return (
            <>
                <p>Inference Metrics <span title="Wingman is offline">{connectionStatus}</span></p>
            </>
        );
    };

    const renderOnlineHeader = (): ReactNode =>
    {
        return (
            <>
                <p>{`Inference Metrics (${wingmanStatus === "complete" ? "inactive" : wingmanStatus})`} <span title="Wingman is online">{connectionStatus}</span> <span>{system.cuda_str}</span></p>
                <p>{system.gpu_name}</p>
                <p><span>Last updated at {lastTime.toLocaleTimeString()}</span></p>
                {isInferring &&
                    <div className="text-xs">
                        <div><span className={`${chartColors.model_alias} text-lg`}>{system.model_alias} {system.quantization ? system.quantization: ""} {system.has_next_token ? "🗣" : ""}</span></div>
                        <div className="flex">
                            {system.ctx_size > -1 &&
                                renderStat(Number(system.ctx_size)?.toLocaleString(undefined, { minimumFractionDigits: 0 }), "MB Context", chartColors.context_length)
                            }

                            {system.mem_required > -1 &&
                                <>
                                    {renderStat(Number(system.mem_required)?.toLocaleString(undefined, { minimumFractionDigits: 0 }), "MB RAM", chartColors.vram_used)}
                                </>
                            }

                            {system.vram_used > -1 &&
                                <>
                                    {renderStat(Number(system.vram_used)?.toLocaleString(undefined, { minimumFractionDigits: 0 }), "MB VRAM", chartColors.vram_used)}
                                    {renderStat(`${system.offloaded} / ${system.offloaded_total}`, "Layers On GPU", chartColors.offloaded)}
                                </>
                            }
                        </div>
                    </div>
                }
            </>);
    };

    const renderHeader = (): ReactNode =>
    {
        if (readyState === ReadyState.OPEN) {
            return renderOnlineHeader();
        } else {
            return renderOfflineHeader();
        }
    };

    return (
        <div className={`${className} text-center`}>
            <div className="flex flex-col items-center space-y-2">
                {renderHeader()}
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={timeSeries} margin={{ top: 20, right: 0, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <YAxis domain={[0, "dataMax + 200"]} allowDataOverflow={true} yAxisId="left" orientation="right" />
                        <YAxis domain={[0, "dataMax + 200"]} allowDataOverflow={true} yAxisId="right" orientation="left" />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" connectNulls={true} name="Tokens/Sec" dataKey="predicted_per_second" stroke="#34a2fa" strokeWidth={3} />
                        <Line yAxisId="left" type="monotone" connectNulls={true} name="Ms/Token Sample" dataKey="sample_per_token_ms" stroke="#999999" />
                        <Line yAxisId="right" type="monotone" connectNulls={true} name="Samples/Sec" dataKey="sample_per_second" stroke="#fa34a3" />
                        <Line yAxisId="right" type="monotone" connectNulls={true} name="Token Pred Time (ms)" dataKey="predicted_per_token_ms" stroke="#ffc658" />
                    </LineChart>
                </ResponsiveContainer>
                <div className="flex flex-row text-xs items-center">
                    <input type="checkbox" className="m-2" disabled={system.has_next_token} checked={pauseMetrics} onChange={() => setPauseMetrics(!pauseMetrics)} />
                    <span>Pause Graph</span>
                </div>
                <div className="flex flex-row text-xs">
                    <div>
                        {metrics.predicted_per_second > -1 &&
                            renderStat(metrics.predicted_per_second, "Token Rate", chartColors.predicted_per_second)
                        }
                        {metrics.predicted_per_token_ms > -1 &&
                            renderStat(metrics.predicted_per_token_ms, "Token Time", chartColors.predicted_per_token_ms)
                        }
                    </div>
                    <div>
                        {metrics.sample_per_second > -1 &&
                            renderStat(metrics.sample_per_second, "Sample Rate", chartColors.sample_per_second)
                        }
                        {metrics.sample_per_token_ms > -1 &&
                            renderStat(metrics.sample_per_token_ms, "Sample Time", chartColors.sample_per_token_ms)
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WingmanChart;