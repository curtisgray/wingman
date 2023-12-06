import { DownloadProps } from "@/types/download";
import React, { useState, ReactNode, useContext } from "react";
import { LineChart, Line, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useWingman } from "@/hooks/useWingman";
import WingmanContext from "@/pages/api/home/wingman.context";


interface WingmanChartProps
{
    chosenModel?: DownloadProps;
    showGraph?: boolean;
    showHardware?: boolean;
    className?: string;
}

const WingmanChart = ({ showGraph = true, showHardware = false, className = "" }: WingmanChartProps) =>
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

    const lowStatCutOff = -1; // set to 0 to keep stats on screen, -1 to allow stats to disappear
    const [showGraphMetrics, setShowGraphMetrics] = useState<boolean>(true);
    const {
        state: { 
            status: connectionStatus,
            isOnline,
            metrics,
            system,
            timeSeries,
            toggleMetrics,
            pauseMetrics
        },
    } = useContext(WingmanContext);

    const toggleGraphMetrics = () => {
        setShowGraphMetrics(!showGraphMetrics);
    };

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
                {showHardware &&
                <p>{system.gpu_name}<span> {system.cuda_str}</span></p>
                }
                <div className="text-xs">
                    <div className="flex">
                        {system.ctx_size > lowStatCutOff &&
                            renderStat(Number(system.ctx_size)?.toLocaleString(undefined, { minimumFractionDigits: 0 }), "MB Context", chartColors.context_length)
                        }

                        {system.mem_required > lowStatCutOff &&
                            <>
                                {renderStat(Number(system.mem_required)?.toLocaleString(undefined, { minimumFractionDigits: 0 }), "MB RAM", chartColors.vram_used)}
                            </>
                        }

                        {system.vram_used > lowStatCutOff &&
                            <>
                                {renderStat(Number(system.vram_used)?.toLocaleString(undefined, { minimumFractionDigits: 0 }), "MB VRAM", chartColors.vram_used)}
                                {renderStat(`${system.offloaded} / ${system.offloaded_total}`, "Layers On GPU", chartColors.offloaded)}
                            </>
                        }
                    </div>
                </div>
            </>);
    };

    const renderHeader = (): ReactNode =>
    {
        if (isOnline) {
            return renderOnlineHeader();
        } else {
            return renderOfflineHeader();
        }
    };

    return (
        <div className={`${className} text-center`}>
            <div className="flex flex-col items-center space-y-2">
                {renderHeader()}
                { showGraphMetrics &&
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
                }
                <div className="flex flex-row text-xs items-center">
                    {/* <input type="checkbox" className="m-2" disabled={system.has_next_token} checked={pauseMetrics} onChange={() => setPauseMetrics(!pauseMetrics)} /> */}
                    <input type="checkbox" className="m-2" checked={showGraphMetrics} onChange={() => toggleGraphMetrics()} />
                    <span>Show Graph</span>

                    <input type="checkbox" className="m-2" disabled={system.has_next_token} checked={pauseMetrics} onChange={() => toggleMetrics()} />
                    <span>Pause Graph</span>
                </div>
                <div className="flex flex-row text-xs">
                    <div>
                        {renderStat(metrics.predicted_per_second, "Token Rate", chartColors.predicted_per_second)}
                        {renderStat(metrics.predicted_per_token_ms, "Token Time", chartColors.predicted_per_token_ms)}
                    </div>
                    <div>
                        {renderStat(metrics.sample_per_second, "Sample Rate", chartColors.sample_per_second)}
                        {renderStat(metrics.sample_per_token_ms, "Sample Time", chartColors.sample_per_token_ms)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WingmanChart;