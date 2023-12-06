import React, { ReactNode, useContext, useEffect, useState } from "react";
import WingmanContext from "@/pages/api/home/wingman.context";
import { WingmanItem } from "@/types/wingman";

const WingmanInferenceStatus = ({title = "Inference Status", className = "" }) =>
{
    const {
        state: { lastWebSocketMessage },
    } = useContext(WingmanContext);

    const [wingmanItem, setWingmanItem] = useState<WingmanItem | undefined>(undefined);

    useEffect(() =>
    {
        if (lastWebSocketMessage?.lastMessage !== undefined) {
            const message = lastWebSocketMessage.lastMessage;
            if (message === undefined || message === "") {
                return;
            }
            const msg = JSON.parse(message);
            if (msg?.isa === "DownloadItem") {
                const wi = msg as WingmanItem;
                    setWingmanItem(wi);
            }
        }

        let isInferringLocal = false;
        if (wingmanItem !== undefined) {
            switch (wingmanItem.status) {
                case "complete":
                    setDownloadLabel(autoActivate ? "Switching...": "Downloaded");
                    setDisabled(true);
                    setProgress(wingmanItem.progress);
                    setProgressText(`${wingmanItem.progress.toPrecision(3)}% ${wingmanItem.downloadSpeed}`);
                    onComplete(wingmanItem);
                    if (autoActivate) {
                        inferenceActions.requestStartInference(filePath, modelRepo, filePath, -1);
                    }
                    break;
                case "downloading":
                    if (!downloadStarted) {
                        setDownloadStarted(true);
                        onStarted(wingmanItem);
                    }
                    setDownloadLabel(autoActivate ? "Cancel Download & Switch": "Cancel Download");
                    setDisabled(false);
                    setProgress(wingmanItem.progress);
                    setProgressText(`${wingmanItem.progress.toPrecision(3)}% ${wingmanItem.downloadSpeed}`);
                    isInferringLocal = true;
                    onProgress(wingmanItem.progress);
                    break;
                case "cancelled":
                    setDownloadLabel(autoActivate ? "Redownload & Switch": "Redownload");
                    setDisabled(false);
                    setProgress(wingmanItem.progress);
                    setProgressText(`${wingmanItem.progress.toPrecision(3)}% ${wingmanItem.downloadSpeed}`);
                    isInferringLocal = false;
                    setDownloadStarted(false);
                    onCancelled(wingmanItem);
                    break;
                case "error":
                    setDownloadLabel("Error");
                    break;
                case "idle":
                    setDownloadLabel(autoActivate ? "Download & Switch": "Download");
                    setDisabled(true);
                    setDownloadStarted(false);
                    break;
                case "queued":
                    setDownloadLabel("Queued");
                    setDisabled(true);
                    setDownloadStarted(false);
                    break;
                default:
                    break;
            }
            setIsDownloading(isInferringLocal);
        }
    }, [lastWebSocketMessage]);

    return (
        <div className={`${className} text-center`}>
            {renderHeader()}
        </div>
    );
};

export default WingmanInferenceStatus;