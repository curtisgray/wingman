/* eslint-disable react-hooks/exhaustive-deps */
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { DownloadItem, StripFormatFromModelRepo } from "@/types/download";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import WingmanContext from "@/pages/api/home/wingman.context";
import HomeContext from "@/pages/api/home/home.context";


export type Props = {
    className?: string;
    showRepoName?: boolean;
    showFileName?: boolean;
    showProgress?: boolean;
    showProgressText?: boolean;
    hideIfDisabled?: boolean;
    onComplete?: (item: DownloadItem) => void;
    onStarted?: (item: DownloadItem) => void;
    onCancelled?: (item: DownloadItem) => void;
    onProgress?: (value: number) => void;
    onInitialized?: (success: boolean) => void;
};


const WingmanDownloadStatus = ({ 
    showRepoName = true, showFileName = true, showProgress = true, showProgressText = true,
    onComplete = () => { }, onStarted = () => { }, onCancelled = () => { }, onProgress = () => { }, onInitialized = () => { },
    className = undefined }: Props) =>
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

    const handleInitializeButton = () =>
    {
        setDisabled(false);
        setDownloadLabel("Download");
        setDownloadStatus("Docked");
        setDownloadStarted(false);
        setDownloadCompleted(false);
        setIsDownloading(false);
        setProgress(0);
        setProgressText("");
    };

    const handleCancelDownload = () =>
    {
        setDisabled(true);
        if (downloadItem !== undefined && downloadStarted)
            downloadActions.requestCancelDownload(downloadItem.modelRepo, downloadItem.filePath);
        setDownloadLabel("Cancelled");
    };

    const handleError = () =>
    {
        setDownloadLabel("Error");
        setDownloadStatus("Failure to Takeoff");
        setDisabled(true);
        setDownloadStarted(false);
    };

    useEffect(() =>
    {
        if (isInitializing) return;
        let localUpdatedDownloadItem = false;
        if (downloadItems !== undefined && downloadItems.length > 0) {
            const di = downloadItems.find((item) => item.status !== "complete" && item.status !== "cancelled");
            if (di === undefined) {
                setDownloadItem(undefined);
                handleInitializeButton();
            } else if (di !== downloadItem) {
                setDownloadItem(di);
                localUpdatedDownloadItem = true;
            }
        } else {
            setDownloadItem(undefined);
        }

        if (localUpdatedDownloadItem) {
            let localIsDownloading = false;
            if (downloadItem !== undefined) {
                switch (downloadItem.status) {
                    case "complete":
                        setDownloadLabel("Downloaded");
                        setDownloadStatus("Aircraft Landed");
                        setDisabled(true);
                        if (isDownloading && !downloadCompleted) {
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
                        if (isDownloading && !downloadCompleted) {
                            setDownloadLabel("Cancelled");
                            setDownloadStatus("Flight Aborted");
                            setDisabled(true);
                            setProgress(downloadItem.progress);
                            // setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                            setProgressText(`${downloadItem.downloadSpeed}`);
                            localIsDownloading = false;
                            setDownloadStarted(false);
                            onCancelled(downloadItem);
                            // handleInitializeButton();
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
            }
        }
    }, [downloadItems]);

    useEffect(() =>
    {
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
                handleInitializeButton();
            }
        }
    }, [downloadItem, isInitialized, isInitializing]);

    if (downloadItem === undefined) {
        return <></>;
    }

    return (
        <div className={className === undefined ? "relative flex text-xs justify-center align-middle bg-gray-600 rounded" : `relative ${className}`}>
            <div className="flex rounded-l">
                <div className="flex flex-col justify-center align-middle space-x-2 px-1 w-40 text-ellipsis z-10">
                    {showRepoName && <p>{StripFormatFromModelRepo(downloadItem.modelRepo)}</p>}
                    {showFileName && <p className="text-gray-300">{downloadItem.filePath}</p>}
                    {showProgress && isDownloading && (
                        <span className="text-xs self-center">{showProgressText && `${progressText}`}</span>
                    )}
                </div>
                {showProgress && isDownloading && (
                    <progress
                        value={progress}
                        max="100"
                        className="w-40 h-full absolute rounded-l"
                    ></progress>
                )}
            </div>
            <button type="button"
                disabled={disabled}
                onClick={handleCancelDownload}
                className="bg-gray-800 hover:bg-gray-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white px-2 rounded-r z-10">
                <p className="self-center">{downloadLabel}</p>
            </button>
        </div>
    );
};

export default WingmanDownloadStatus;