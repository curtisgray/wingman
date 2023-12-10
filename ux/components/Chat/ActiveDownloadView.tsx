/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import { DownloadButtonProps, DownloadItem } from "@/types/download";
import { HF_MODEL_ENDS_WITH } from "@/utils/app/const";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import WingmanContext from "@/pages/api/home/wingman.context";

const ActiveDownloadView = ({ modelRepo, filePath,
    showRepoName = true, showFileName = true, showProgress = true, showProgressText = true,
    onComplete = () => { }, onStarted = () => { }, onCancelled = () => { }, onProgress = () => { },
    className = undefined, children = undefined, autoStart: autoActivate = false }: DownloadButtonProps) =>
{
    const {
        state: { lastWebSocketMessage },
    } = useContext(WingmanContext);

    const downloadActions = useRequestDownloadAction();
    const inferenceActions = useRequestInferenceAction();

    const [downloadItem, setDownloadItem] = useState<DownloadItem | undefined>(undefined);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [progressText, setProgressText] = useState<string>("");
    const [downloadLabel, setDownloadLabel] = useState<string>(autoActivate ? "Download & Switch": "Download");
    const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
    
    const handleRequestDownload = () => {
        downloadActions.requestDownload(modelRepo, filePath);
        setDownloadLabel("Queued");
    };

    const handleCancelDownload = () => {
        downloadActions.requestCancelDownload(modelRepo, filePath);
        setDownloadLabel(autoActivate ? "Redownload & Switch": "Redownload");
    };

    const handleRequestOrCancelDownload = () => {
        if (downloadStarted) {
            handleCancelDownload();
        } else {
            handleRequestDownload();
        }
    };

    useEffect(() =>
    {
        if (lastWebSocketMessage?.lastMessage !== undefined) {
            const message = lastWebSocketMessage.lastMessage;
            if (message === undefined || message === "") {
                return;
            }
            const msg = JSON.parse(message);
            if (msg?.isa === "DownloadItem") {
                const di = msg as DownloadItem;
                if (di.modelRepo === modelRepo && di.filePath === filePath) {
                    setDownloadItem(di);
                }
            }
        }

        let isDownloadingLocal = false;
        if (downloadItem !== undefined) {
            switch (downloadItem.status) {
                case "complete":
                    setDownloadLabel(autoActivate ? "Switching...": "Downloaded");
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    onComplete(downloadItem);
                    if (autoActivate) {
                        inferenceActions.requestStartInference(filePath, modelRepo, filePath, -1);
                    }
                    break;
                case "downloading":
                    if (!downloadStarted) {
                        setDownloadStarted(true);
                        onStarted(downloadItem);
                    }
                    setDownloadLabel(autoActivate ? "Cancel Download & Switch": "Cancel Download");
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    isDownloadingLocal = true;
                    onProgress(downloadItem.progress);
                    break;
                case "cancelled":
                    setDownloadLabel(autoActivate ? "Redownload & Switch": "Redownload");
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    isDownloadingLocal = false;
                    setDownloadStarted(false);
                    onCancelled(downloadItem);
                    break;
                case "error":
                    setDownloadLabel("Error");
                    break;
                case "idle":
                    setDownloadLabel(autoActivate ? "Download & Switch": "Download");
                    setDownloadStarted(false);
                    break;
                case "queued":
                    setDownloadLabel("Queued");
                    setDownloadStarted(false);
                    break;
                default:
                    break;
            }
            setIsDownloading(isDownloadingLocal);
        }
    }, [lastWebSocketMessage]);

    return (
        <div className={className == undefined ? "flex flex-col bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
            {
                children == undefined ?
                    (
                        <>
                            <p className="self-center">{downloadLabel}</p>
                            {showRepoName && <p>{modelRepo.replace(HF_MODEL_ENDS_WITH, "")}</p>}
                            {showFileName && <p className="text-gray-300">{filePath}</p>}
                            {showProgress && isDownloading && <progress
                                value={progress}
                                max="100"
                                className="mt-2 w-full"
                            ></progress>}
                            {showProgressText && isDownloading && ` ${progressText}`}
                        </>
                    ) : children
            }
        </div>
    );
};

export default ActiveDownloadView;