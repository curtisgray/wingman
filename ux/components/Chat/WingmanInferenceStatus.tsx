/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";
import { WingmanItem, hasActiveStatus } from "@/types/wingman";
import { StripFormatFromModelRepo, quantizationFromFilePath } from "@/types/download";
// import HomeContext from "@/pages/api/home/home.context";

const WingmanInferenceStatus = ({title = "Inference Status", showTitle = true, showModel = true, showQuantization = true, showAlias = false, className = "" }) =>
{
    const {
        state: { wingmanItems },
    } = useContext(WingmanContext);
    // const {
    //     state: { selectedConversation },
    // } = useContext(HomeContext);

    const [wingmanItem, setWingmanItem] = useState<WingmanItem | undefined>(undefined);
    const [wingmanStatusLabel, setWingmanStatusLabel] = useState<string>("unknown");
    const [wingmanStatusTitle, setWingmanStatusTitle] = useState<string>("");
    // const [isInferring, setIsInferring] = useState<boolean>(false);
    const [model, setModel] = useState<string>("");
    const [modelAlias, setModelAlias] = useState<string>("");
    const [quantizationName, setQuantizationName] = useState<string>("");

    const reset = () =>
    {
        setWingmanItem(undefined);
        setWingmanStatusLabel("unknown");
        setWingmanStatusTitle("");
        // setIsInferring(false);
        setModel("");
        setModelAlias("");
        setQuantizationName("");
    };

    useEffect(() =>
    {
        // if (lastWebSocketMessage?.lastMessage !== undefined) {
        //     const message = lastWebSocketMessage.lastMessage;
        //     if (message === undefined || message === "") {
        //         return;
        //     }
        //     const msg = JSON.parse(message);
        //     if (msg?.isa === "WingmanItem") {
        //         if (msg?.alias === alias) {
        //             const wi = msg as WingmanItem;
        //             setWingmanItem(wi);
        //             if (showTitle)
        //                 setWingmanStatusTitle(title);
        //             if (showModel)
        //                 setModel(StripFormatFromModelRepo(wi.modelRepo));
        //             if (showAlias)
        //                 setModelAlias(wi.alias);
        //             const quantizationLocal = quantizationFromFilePath(wi.filePath);
        //             if (showQuantization){
        //                 setQuantization(quantizationLocal.quantization);
        //                 setQuantizationName(quantizationLocal.quantizationName);
        //             }
        //         }
        //     }
        // }

        if (wingmanItems !== undefined && wingmanItems.length > 0) {
            const wi = wingmanItems.find((wi) => hasActiveStatus(wi));
            if (wi !== undefined) {
                setWingmanItem(wi);
                // setIsInferring(true);
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
                setWingmanStatusLabel(wi.status.charAt(0).toUpperCase() + wi.status.slice(1));
            } else {
                reset();
            }
        }

        // let ii = false;
        // if (wingmanItem !== undefined) {
        //     switch (wingmanItem.status) {
        //         case "queued":
        //             setWingmanStatusLabel("Queuing");
        //             break;
        //         case "preparing":
        //             setWingmanStatusLabel("Preparing");
        //             break;
        //         case "inferring":
        //             setWingmanStatusLabel("Inferring");
        //             ii = true;
        //             break;
        //         case "complete":
        //             setWingmanStatusLabel("Completed");
        //             break;
        //         case "error":
        //             setWingmanStatusLabel("Error");
        //             break;
        //         case "cancelling":
        //             setWingmanStatusLabel("Cancelling");
        //             break;
        //         case "cancelled":
        //             setWingmanStatusLabel("Cancelled");
        //             break;
        //         case "unknown":
        //             setWingmanStatusLabel("Unknown");
        //             break;
        //         default:
        //             break;
        //     }
            // setIsInferring(ii);
        // }
    }, [wingmanItems]);

    return (
        <div className={`${className} text-center`}>
            {/* <p>{wingmanStatusTitle} {wingmanStatusLabel} {isInferring && <span className="animate-pulse">...</span>} {model} {modelAlias} {quantizationName}</p> */}
            <p>{wingmanStatusTitle} {wingmanStatusLabel} {(wingmanItem && hasActiveStatus(wingmanItem)) && <span className="animate-pulse">...</span>} {model} {modelAlias} {quantizationName}</p>
        </div>
    );
};

export default WingmanInferenceStatus;