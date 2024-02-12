/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";
import { WingmanItem } from "@/types/wingman";
import { StripFormatFromModelRepo, quantizationFromFilePath } from "@/types/download";
import { IconRotateRectangle } from "@tabler/icons-react";
import { Tooltip } from "react-tooltip";
import HomeContext from "@/pages/api/home/home.context";
import Image from "next/image";
import { AIModel, Vendors } from "@/types/ai";

const WingmanInferenceStatus = ({title = "Inference Status", showTitle = true, showModel = true, showQuantization = true, showAlias = false, className = "" }) =>
{
    const {
        state: { wingmanItems, currentWingmanInferenceItem, isOnline },
    } = useContext(WingmanContext);

    const {
        state: { models, globalModel },
        handleSyncModel
    } = useContext(HomeContext)

    const [wingmanItem, setWingmanItem] = useState<WingmanItem | undefined>(undefined);
    const [wingmanStatusLabel, setWingmanStatusLabel] = useState<string>("unknown");
    const [wingmanStatusTitle, setWingmanStatusTitle] = useState<string>("");
    const [model, setModel] = useState<string>("");
    const [modelAlias, setModelAlias] = useState<string>("");
    const [quantizationName, setQuantizationName] = useState<string>("");
    const [downloadableModelSelected, setDownloadableModelSelected] = useState<boolean>(false);
    const [isRunningInferenceModel, setIsRunningInferenceModel] = useState<boolean>(false);

    const reset = () =>
    {
        setWingmanItem(undefined);
        setDownloadableModelSelected(false);
        setIsRunningInferenceModel(false);
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
                return <span className="inline-flex h-2 w-2 mx-1 rounded-full dark:bg-white bg-black"></span>;
        }
    };

    const displaySyncModelControl = () =>
    {
        if (downloadableModelSelected)
            return <><IconRotateRectangle size={18} className="rounded-sm cursor-pointer" onClick={handleSyncModelLocal}
                data-tooltip-id="sync-selected-model" data-tooltip-content="Engage the AI model that's currently running on the server" />
                <Tooltip id="sync-selected-model" /></>;
        else
            return <></>;
    }

    const handleSyncModelLocal = () =>
    {
        if (wingmanItem !== undefined) {
            // handleSyncModel(wingmanItem);
            // find model in models by wingmanItem
            const model = models.find((m) => m.id === wingmanItem.modelRepo);
            if (model !== undefined) {
                const draftModel = {...model};
                const vendor = Vendors[model.vendor];
                if (vendor !== undefined && vendor.isDownloadable) {
                    const item = model.items?.find((item) => item.filePath === wingmanItem.filePath);
                    draftModel.item = item;
                }
                handleSyncModel(draftModel);
            }
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
                        setWingmanStatusLabel("Engaged"); // The item is actively being processed, akin to a plane that has taken off and is in flight
                        break;
                    case "complete":
                        setWingmanStatusLabel("Mission Complete"); // Signifies the successful completion of the task, like a plane safely landing
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
                setDownloadableModelSelected(true);
                if (wi.modelRepo === globalModel?.id && wi.filePath === globalModel?.item?.filePath) {
                    setIsRunningInferenceModel(true);
                } else {
                    setIsRunningInferenceModel(false);
                }
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
        } else {
            reset();
        }
    }, [wingmanItems, currentWingmanInferenceItem, globalModel, models]);
    

    const displayModelVendor = (model: AIModel | undefined) =>
    {
        if (!model) return <></>;
        const vendor = Vendors[model.vendor];
        return (
            <div className="flex space-x-1">
                <Image
                    src={vendor.logo}
                    width={18}
                    alt={vendor.displayName}
                />
                <span className="">{vendor.displayName}</span>
                <span className="">{model.name}</span>
            </div>
        );
    };

    // if running an API model, just return the name of the model
    if (globalModel && !Vendors[globalModel.vendor].isDownloadable)
    {
        return (
            <div className={`${className}`}>
                <span>{displayModelVendor(globalModel)}</span>
            </div>
        );
    }

    if (!isOnline)
        return (
            <div className={`${className}`}>
                <span>Wingman is offline</span>
            </div>
        );

    if (currentWingmanInferenceItem && currentWingmanInferenceItem.alias) {
        return (
            <div className={`${className} flex`}>
                <span>{wingmanStatusTitle} <span>{model} {modelAlias} {(showQuantization) && <span>({quantizationName})</span>}</span> {displayMonitoredStatusIndicator(wingmanItem)} {wingmanStatusLabel}</span>
                &nbsp;{displaySyncModelControl()}
            </div>
        );
    } else {
        return (
            <div className={`${className}`}>
                No AI model is running
            </div>
        );
    }
};

export default WingmanInferenceStatus;