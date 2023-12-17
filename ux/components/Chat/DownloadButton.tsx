/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import { DownloadButtonProps, DownloadItem } from "@/types/download";
import { HF_MODEL_ENDS_WITH } from "@/utils/app/const";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import WingmanContext from "@/pages/api/home/wingman.context";

const DownloadButton = ({ modelRepo, filePath,
    showRepoName = true, showFileName = true, showProgress = true, showProgressText = true,
    onComplete = () => { }, onStarted = () => { }, onCancelled = () => { }, onProgress = () => { },
    className = undefined, children = undefined, autoStart = false }: DownloadButtonProps) =>
{
    const {
        state: { downloadItems },
    } = useContext(WingmanContext);

    const downloadActions = useRequestDownloadAction();

    const [downloadItem, setDownloadItem] = useState<DownloadItem | undefined>(undefined);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
    const [downloadCompleted, setDownloadCompleted] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [progressText, setProgressText] = useState<string>("");
    const [downloadLabel, setDownloadLabel] = useState<string>("Download");
    const [downloadStatus, setDownloadStatus] = useState<string>("Docked");
    const [disabled, setDisabled] = useState<boolean>(false);
    
    const handleRequestDownload = () => {
        setDisabled(true);
        downloadActions.requestDownload(modelRepo, filePath);
        setDownloadLabel("Queued");
    };

    const handleCancelDownload = () => {
        setDisabled(false);
        downloadActions.requestCancelDownload(modelRepo, filePath);
        setDownloadLabel("Redownload");
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
        // if (lastWebSocketMessage?.lastMessage !== undefined) {
        //     const message = lastWebSocketMessage.lastMessage;
        //     if (message === undefined || message === "") {
        //         return;
        //     }
        //     const msg = JSON.parse(message);
        //     if (msg?.isa === "DownloadItem") {
        //         const di = msg as DownloadItem;
        //         if (di.modelRepo === modelRepo && di.filePath === filePath) {
        //             setDownloadItem(di);
        //         }
        //     }
        // }
        if (downloadItems !== undefined) {
            const di = downloadItems.find((item) => item.modelRepo === modelRepo && item.filePath === filePath);
            if (di !== undefined) {
                setDownloadItem(di);
            }
        }

        let isDownloadingLocal = false;
        if (downloadItem !== undefined) {
            switch (downloadItem.status) {
                case "complete":
                    if (isDownloading && !downloadCompleted){
                        setDownloadLabel("Downloaded");
                        setDownloadStatus("Aircraft Landed");
                        setDisabled(true);
                        setProgress(downloadItem.progress);
                        setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                        setDownloadCompleted(true);
                        onComplete(downloadItem);
                    }
                    break;
                case "downloading":
                    if (!downloadStarted) {
                        setDownloadStarted(true);
                        onStarted(downloadItem);
                    }
                    setDownloadLabel("Cancel Download");
                    setDownloadStatus(`Aircraft in Flight - ${downloadItem.progress.toPrecision(3)}%}`);
                    setDisabled(false);
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    isDownloadingLocal = true;
                    onProgress(downloadItem.progress);
                    break;
                case "cancelled":
                    if (isDownloading && !downloadCompleted){
                        setDownloadLabel("Redownload");
                        setDownloadStatus("Flight Aborted");
                        setDisabled(false);
                        setProgress(downloadItem.progress);
                        setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                        isDownloadingLocal = false;
                        setDownloadStarted(false);
                        onCancelled(downloadItem);
                    }
                    break;
                case "error":
                    setDownloadLabel("Error");
                    setDownloadStatus("Failure to Takeoff");
                    break;
                case "idle":
                    setDownloadLabel("Download");
                    setDownloadStatus("Aircraft Docked");
                    setDisabled(true);
                    setDownloadStarted(false);
                    break;
                case "queued":
                    setDownloadLabel("Queued");
                    setDownloadStatus("Ready for Takeoff");
                    setDisabled(true);
                    setDownloadStarted(false);
                    break;
                default:
                    break;
            }
            setIsDownloading(isDownloadingLocal);
        }
    }, [downloadItems]);

    useEffect(() => {
        if (autoStart) {
            handleRequestDownload();
        }
    }, []);

    return (
        <button type="button" disabled={disabled}
            onClick={handleRequestOrCancelDownload}
            className={className == undefined ? "flex flex-col bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
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
        </button>
    );
};

export default DownloadButton;