/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";
import { WingmanItem, getWingmanItemStatusMessage } from "@/types/wingman";
import { StripFormatFromModelRepo, quantizationFromFilePath } from "@/types/download";
import HomeContext from "@/pages/api/home/home.context";
import { AIModelID, VendorInfo, Vendors } from "@/types/ai";
import { displayVendorIcon } from "./Util";

const SelectedConversationModelStatus = ({ showModel = true, showQuantization = true, showAlias = false, className = "" }) =>
{
    const NO_MODEL_SELECTED = "Choose AI model";
    const {
        state: { isOnline, wingmanItems },
    } = useContext(WingmanContext);

    const {
        state: { selectedConversation },
    } = useContext(HomeContext);

    const [wingmanItem, setWingmanItem] = useState<WingmanItem | undefined>(undefined);
    const [modelName, setModelName] = useState<string>("");
    const [modelAlias, setModelAlias] = useState<string>("");
    const [statusMessage, setStatusMessage] = useState<string>("unknown");
    const [vendor, setVendor] = useState<VendorInfo>(Vendors["unknown"]);
    const [quantizationName, setQuantizationName] = useState<string>("");

    const reset = () =>
    {
        setModelName(NO_MODEL_SELECTED);
        setModelAlias("");
        setQuantizationName("");
        setStatusMessage("");
        setVendor(Vendors["unknown"]);
    };

    const displayMonitoredStatusIndicator = (item: WingmanItem | undefined) =>
    {
        if (modelName === NO_MODEL_SELECTED) return <></>;
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
        if (selectedConversation && selectedConversation.model) {
            const model = selectedConversation.model;
            if (model.id === AIModelID.NO_MODEL_SELECTED) {
                reset();
                return;
            }
            const selectedModelVendor = Vendors[model.vendor];
            setVendor(selectedModelVendor);
            if (showModel)
                setModelName(StripFormatFromModelRepo(model.id));
            else
                setModelName(NO_MODEL_SELECTED);
            if (selectedModelVendor.isDownloadable) {
                if (!model.item) throw new Error("Downloadable model is selected, but model item is undefined");
                const wi = wingmanItems.find((wi) => wi.alias === model.item?.filePath);
                if (wi)
                    setWingmanItem(wi);
                else
                    setWingmanItem(undefined);
                setStatusMessage(getWingmanItemStatusMessage(wi));
                if (showAlias)
                    setModelAlias(model.item.filePath);
                else
                    setModelAlias("");
                const quantizationLocal = quantizationFromFilePath(model.item.filePath);
                if (showQuantization)
                    setQuantizationName(quantizationLocal.quantizationName);
                else
                    setQuantizationName("");
            } else {
                setWingmanItem(undefined);
                setModelAlias("");
                setQuantizationName("");
            }
        } else {
            reset();
        }
    }, [selectedConversation, wingmanItems]);

    if (!isOnline)
        return (
            <div className={`${className}`}>
                <span>Wingman is offline</span>
            </div>
        );

    if (selectedConversation && selectedConversation.model) {
        return (
            <>
                <div className={`${className} flex px-1 dark:border-none dark:bg-gray-800 dark:text-gray-200 rounded`}>
                    <div className="flex space-x-1">
                        {displayVendorIcon(vendor)}
                        <span>{modelName} {modelAlias} {(showQuantization) && <span>({quantizationName})</span>}
                            {displayMonitoredStatusIndicator(wingmanItem)} {statusMessage}
                        </span>
                    </div>
                </div>
            </>
        );
    } else {
        return (
            <div className={`${className}`}>
                NO_MODEL_SELECTED
            </div>
        );
    }
};

export default SelectedConversationModelStatus;