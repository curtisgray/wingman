/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";
import { WingmanItem, getWingmanItemStatusMessage } from "@/types/wingman";
import { StripFormatFromModelRepo, quantizationFromFilePath } from "@/types/download";
import HomeContext from "@/pages/api/home/home.context";
import { AIModelID, VendorInfo, Vendors } from "@/types/ai";
import { displayModelVendor, displayVendorIcon } from "./Util";

const WingmanInferenceStatus = ({ title = "Inference Status", showTitle = true, showModel = true, showQuantization = true, showAlias = false, className = "" }) =>
{
    const {
        state: { wingmanItems, currentWingmanInferenceItem, isOnline },
        handleUpdateWingmanStatusMessage,
    } = useContext(WingmanContext);

    const {
        state: { models, globalModel, isModelSelected },
    } = useContext(HomeContext);

    const [wingmanItem, setWingmanItem] = useState<WingmanItem | undefined>(undefined);
    const [wingmanStatusLabel, setWingmanStatusLabel] = useState<string>("unknown");
    const [wingmanStatusTitle, setWingmanStatusTitle] = useState<string>("");
    const [model, setModel] = useState<string>("");
    const [modelAlias, setModelAlias] = useState<string>("");
    const [vendor, setVendor] = useState<VendorInfo>(Vendors["unknown"]);
    const [quantizationName, setQuantizationName] = useState<string>("");
    const [downloadableModelSelected, setDownloadableModelSelected] = useState<boolean>(false);
    const [isRunningInferenceModel, setIsRunningInferenceModel] = useState<boolean>(false);
    // const [isChatSettingsDialogOpen, setIsChatSettingsDialogOpen] = useState<boolean>(false);

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

    useEffect(() =>
    {
        const updateWingmanStatusLabel = (wi: WingmanItem) =>
        {
            setWingmanStatusLabel(getWingmanItemStatusMessage(wi));
        };

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
                if (showQuantization) {
                    setQuantizationName(quantizationLocal.quantizationName);
                }
                updateWingmanStatusLabel(wi);
                // find model vendor for wi
                const model = models.find((m) => m.id === wi.modelRepo);
                if (model !== undefined) {
                    setVendor(Vendors[model.vendor]);
                }
            } else {
                reset();
            }
        } else {
            reset();
        }
    }, [wingmanItems, currentWingmanInferenceItem, globalModel, models]);

    useEffect(() =>
    {
        handleUpdateWingmanStatusMessage(wingmanStatusLabel);
    }, [wingmanStatusLabel]);

    // if isModelSelected is false, return no model running
    if (!isModelSelected)
        return (
            <div className={`${className}`}>
                <span>No AI model selected</span>
            </div>
        );

    // if AIModelID.NO_MODEL_SELECTED is selected, return no model running
    if (globalModel && globalModel.id === AIModelID.NO_MODEL_SELECTED)
        return (
            <div className={`${className}`}>
                <span>No AI model engaged</span>
            </div>
        );

    // if running an API model, just return the name of the model
    if (globalModel && !Vendors[globalModel.vendor].isDownloadable) {
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
            <>
                <div className={`${className} flex px-1 dark:border-none dark:bg-gray-800 dark:text-gray-200 rounded`}>
                    <div className="flex space-x-1">
                        {displayVendorIcon(vendor)}
                        <span>{wingmanStatusTitle} <span>{model} {modelAlias} {(showQuantization) && <span>({quantizationName})</span>}</span>
                            {displayMonitoredStatusIndicator(wingmanItem)} {wingmanStatusLabel}
                        </span>
                    </div>
                </div>
            </>
        );
    } else {
        return (
            <div className={`${className}`}>
                No AI model engaged
            </div>
        );
    }
};

export default WingmanInferenceStatus;