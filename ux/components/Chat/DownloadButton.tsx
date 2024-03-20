/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import { DownloadButtonProps, DownloadItem } from "@/types/download";
import { HF_MODEL_ENDS_WITH } from "@/utils/app/const";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import WingmanContext from "@/pages/api/home/wingman.context";
import HomeContext from "@/pages/api/home/home.context";
import { Tooltip } from "react-tooltip";

const DownloadButton = ({ modelRepo, filePath,
    showRepoName = true, showFileName = true, showProgress = true, showProgressText = true,
    onComplete = () => { }, onStarted = () => { }, onCancelled = () => { }, onProgress = () => { }, onInitialized = () => { },
    className = undefined, children = undefined, autoStart = false }: DownloadButtonProps) =>
{
    const {
        state: { downloadItems },
    } = useContext(WingmanContext);

    const { handleRefreshModels } = useContext(HomeContext);

    const downloadActions = useRequestDownloadAction();

    const [downloadItem, setDownloadItem] = useState<DownloadItem | undefined>(undefined);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
    const [downloadCompleted, setDownloadCompleted] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [progressText, setProgressText] = useState<string>("");
    const [downloadLabel, setDownloadLabel] = useState<React.ReactNode>("Download");
    const [downloadStatus, setDownloadStatus] = useState<string>("Docked");
    const [disabled, setDisabled] = useState<boolean>(true);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isInitializing, setIsInitializing] = useState<boolean>(false);
    const [tooltipString, setTooltipString] = useState<string>("");
 
    const handleInitializeButton = () => {
        setDisabled(false);
        setDownloadLabel("Download");
        setDownloadStatus("Docked");
        setDownloadStarted(false);
        setDownloadCompleted(false);
        setIsDownloading(false);
        setProgress(0);
        setProgressText("");
    };

    const handleRequestDownload = () => {
        setDisabled(true);
        downloadActions.requestDownload(modelRepo, filePath);
        setIsDownloading(true);
        setDownloadLabel("Queued");
    };

    const handleCancelDownload = () => {
        setDisabled(false);
        downloadActions.requestCancelDownload(modelRepo, filePath);
        setDownloadLabel("Reset");
    };

    const handleRequestOrCancelDownload = () => {
        if (downloadStarted) {
            handleCancelDownload();
        } else {
            handleRequestDownload();
        }
    };

    const handleError = () => {
        setDownloadLabel("Error");
        setDownloadStatus("Failure to Takeoff");
        setDisabled(true);
        setDownloadStarted(false);
    };

    useEffect(() =>
    {
        if (isInitializing) return;
        let localUpdatedDownloadItem = false;
        if (downloadItems !== undefined) {
            const di = downloadItems.find((item) => item.modelRepo === modelRepo && item.filePath === filePath);
            if (di !== undefined && di !== downloadItem) {
                setDownloadItem(di);
                localUpdatedDownloadItem = true;
            }
        }

        if (localUpdatedDownloadItem) {
            let localIsDownloading = false;
            if (downloadItem !== undefined) {
                switch (downloadItem.status) {
                    case "complete":
                        setDownloadLabel("Downloaded");
                        setDownloadStatus("Aircraft Landed");
                        setDisabled(true);
                        if (isDownloading && !downloadCompleted){
                            setProgress(downloadItem.progress);
                            // setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                            setProgressText(`${downloadItem.downloadSpeed}`);
                            setDownloadCompleted(true);
                            onComplete(downloadItem);
                            handleRefreshModels();
                        }
                        break;
                    case "downloading":
                        if (!downloadStarted) {
                            setDownloadStarted(true);
                            onStarted(downloadItem);
                        }
                        // setDownloadLabel("Cancel Download");
                        setDownloadLabel("Cancel");
                        setDownloadStatus(`Aircraft in Flight - ${downloadItem.progress.toPrecision(3)}%}`);
                        setDisabled(false);
                        setProgress(downloadItem.progress);
                        // setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                        setProgressText(`${downloadItem.downloadSpeed}`);
                        localIsDownloading = true;
                        onProgress(downloadItem.progress);
                        break;
                    case "cancelled":
                        if (isDownloading && !downloadCompleted){
                            setDownloadLabel("Reset");
                            setDownloadStatus("Flight Aborted");
                            setDisabled(false);
                            setProgress(downloadItem.progress);
                            // setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                            setProgressText(`${downloadItem.downloadSpeed}`);
                            localIsDownloading = false;
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
                setIsDownloading(localIsDownloading);
                if (localIsDownloading) {
                    setTooltipString(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                } else {
                    setTooltipString("");
                }
            }
        }
    }, [downloadItems]);

    useEffect(() => {
        if (isInitializing && isInitialized) {
            setIsInitializing(false);
            if (downloadItem !== undefined) {
                if (downloadItem.status === "complete") {
                    setIsDownloading(false);
                    setDownloadLabel("Downloaded");
                    setDownloadStatus("Aircraft Landed");
                    setDisabled(true);
                }
            } else {
                if (autoStart)
                    handleRequestDownload();
                else
                    handleInitializeButton();
            }
        }
    }, [downloadItem, isInitialized, isInitializing]);

    useEffect(() => {
        setIsInitializing(true);
        setDownloadLabel(<span className="animate-pulse inline-flex h-2 w-2 mx-1 rounded-full bg-orange-400"></span>);
        setDisabled(true);
        // request download status to set initial state of the control
        const response = downloadActions.requestDownloadItems(modelRepo, filePath);
        if (response !== undefined) {
            response.then((items) => {
                if (items.length > 0)
                    setDownloadItem(items[0]);
                setIsInitialized(true);
                onInitialized(true);
            });
            response.catch(() => {
                setIsInitialized(true);
                handleError();
                onInitialized(false);
            });
        } else {
            setIsInitialized(true);
            handleError();
            onInitialized(false);
        }
    }, []);

    return (
        <button type="button" disabled={disabled}
            onClick={handleRequestOrCancelDownload}
            data-tooltip-id="download-status"
            data-tooltip-content={`${tooltipString}`}
            className={className == undefined ? "relative flex flex-col w-24 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 px-4 rounded" : `relative ${className}`}>
            {
                children == undefined ?
                    (
                        <>
                            <p className="self-center z-10">{downloadLabel}</p>
                            {showRepoName && <p>{modelRepo.replace(HF_MODEL_ENDS_WITH, "")}</p>}
                            {showFileName && <p className="text-gray-300">{filePath}</p>}
                            <span className="text-xs self-center z-10">{showProgressText && isDownloading && ` ${progressText}`}</span>
                            {showProgress && isDownloading && <progress
                                value={progress}
                                max="100"
                                className="w-24 h-full absolute top-0 left-0 [&::-webkit-progress-bar]:rounded [&::-webkit-progress-value]:rounded [&::-webkit-progress-value]:bg-amber-500 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500"
                            ></progress>}
                            <Tooltip id="download-status" />
                        </>
                    ) : children
            }
        </button>
    );
};

export default DownloadButton;