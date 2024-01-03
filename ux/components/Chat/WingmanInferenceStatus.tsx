/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";
import { WingmanItem } from "@/types/wingman";
import { StripFormatFromModelRepo, quantizationFromFilePath } from "@/types/download";

const WingmanInferenceStatus = ({title = "Inference Status", showTitle = true, showModel = true, showQuantization = true, showAlias = false, className = "" }) =>
{
    const {
        state: { wingmanItems, currentWingmanInferenceItem },
    } = useContext(WingmanContext);

    const [wingmanItem, setWingmanItem] = useState<WingmanItem | undefined>(undefined);
    const [wingmanStatusLabel, setWingmanStatusLabel] = useState<string>("unknown");
    const [wingmanStatusTitle, setWingmanStatusTitle] = useState<string>("");
    const [model, setModel] = useState<string>("");
    const [modelAlias, setModelAlias] = useState<string>("");
    const [quantizationName, setQuantizationName] = useState<string>("");

    const reset = () =>
    {
        setWingmanItem(undefined);
        setWingmanStatusLabel("unknown");
        setWingmanStatusTitle("");
        setModel("");
        setModelAlias("");
        setQuantizationName("");
    };

    const displayMonitoredStatusIndicator = (item: WingmanItem | undefined) =>
    {
        switch (item?.status) {
            case "queued":
            case "preparing":
                return <span className="animate-pulse inline-flex h-2 w-2 mx-1 rounded-full bg-orange-400"></span>;
            case "inferring":
                return <span className="animate-pulse inline-flex h-2 w-2 mx-1 rounded-full bg-sky-400"></span>;
            case "cancelling":
                return <span className="animate-pulse inline-flex h-2 w-2 mx-1 rounded-full bg-fuchsia-400"></span>;
            case "error":
                return <span className="inline-flex h-2 w-2 mx-1 rounded-full bg-red-400"></span>;
            default:
                return <span className="inline-flex h-2 w-2 mx-1 rounded-full bg-sky-900"></span>;
        }
    };

    useEffect(() =>
    {
        const updateWingmanStatusLabel = (wi: WingmanItem) =>
        {
            if (wi !== undefined) {
                switch (wi.status) {
                    case "queued":
                        setWingmanStatusLabel("Mission Briefing"); // The item is queued and ready to start, like an aircraft taxiing to the runway for takeoff
                        break;
                    case "preparing":
                        setWingmanStatusLabel("Final Checks"); // The item is in the final preparation stages, similar to an aircraft cleared for takeoff
                        break;
                    case "inferring":
                        setWingmanStatusLabel("Mission Underway"); // The item is actively being processed, akin to a plane that has taken off and is in flight
                        break;
                    case "complete":
                        setWingmanStatusLabel("Mission Accomplished"); // Signifies the successful completion of the task, like a plane safely landing
                        break;
                    case "error":
                        setWingmanStatusLabel("Mission Compromised"); // Communicates a problem or error, as in distress signals
                        break;
                    case "cancelling":
                        setWingmanStatusLabel("Mission Aborted"); // Indicates aborting the current task and returning, similar to a plane returning to base
                        break;
                    case "unknown":
                        setWingmanStatusLabel("Mission Status Unknown"); // Reflects uncertainty or lack of information about the status
                        break;
                    default:
                        break;
                }
            }
        }

        if (currentWingmanInferenceItem && wingmanItems?.length > 0) {
            const wi = wingmanItems.find((wi) => wi.filePath === currentWingmanInferenceItem?.alias);
            if (wi !== undefined) {
                setWingmanItem(wi);
                if (showTitle)
                    setWingmanStatusTitle(title);
                if (showModel)
                    setModel(StripFormatFromModelRepo(wi.modelRepo));
                if (showAlias)
                    setModelAlias(wi.alias);
                const quantizationLocal = quantizationFromFilePath(wi.filePath);
                if (showQuantization){
                    setQuantizationName(quantizationLocal.quantizationName);
                }
                updateWingmanStatusLabel(wi);
            } else {
                reset();
            }
        }

    }, [wingmanItems, currentWingmanInferenceItem]);
    
    if (currentWingmanInferenceItem && currentWingmanInferenceItem.alias) {
        return (
            <div className={`${className}`}>
                <span>{wingmanStatusTitle} <span>{model} {modelAlias} {(showQuantization) && <span>({quantizationName})</span>}</span> {displayMonitoredStatusIndicator(wingmanItem)} {wingmanStatusLabel}</span>
            </div>
        );
    } else {
        return (<></>);
    }
};

export default WingmanInferenceStatus;