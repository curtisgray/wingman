/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect, useState } from "react";
import { DownloadButtonProps, DownloadItem } from "@/types/download";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import { HF_MODEL_ENDS_WITH } from "@/utils/app/const";
import WingmanContext from "@/pages/api/home/wingman.context";

const DeleteDownloadButton = ({ modelRepo, filePath, className = undefined, children = undefined, hideIfDisabled = undefined }: DownloadButtonProps) =>
{
    const {
        state: { lastWebSocketMessage },
    } = useContext(WingmanContext);

    const downloadActions = useRequestDownloadAction();
    const handleRequestResetDownload = () => downloadActions.requestResetDownload(modelRepo, filePath);
    
    const [downloadItem, setDownloadItem] = useState<DownloadItem | undefined>(undefined);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [progressText, setProgressText] = useState<string>("");
    const [disabled, setDisabled] = useState<boolean>(false);
    const [downloadStarted, setDownloadStarted] = useState<boolean>(false);

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
                    setDisabled(true);
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    break;
                case "downloading":
                    if (!downloadStarted) {
                        setDownloadStarted(true);
                    }
                    setDisabled(false);
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    isDownloadingLocal = true;
                    break;
                case "cancelled":
                    setDisabled(false);
                    setProgress(downloadItem.progress);
                    setProgressText(`${downloadItem.progress.toPrecision(3)}% ${downloadItem.downloadSpeed}`);
                    isDownloadingLocal = false;
                    setDownloadStarted(false);
                    break;
                case "error":
                    break;
                case "idle":
                    setDisabled(true);
                    setDownloadStarted(false);
                    break;
                case "queued":
                    setDisabled(true);
                    setDownloadStarted(false);
                    break;
                default:
                    break;
            }
            setIsDownloading(isDownloadingLocal);
        }
    }, [lastWebSocketMessage]);

    // only enable the button if the download item exists and the system is online
    const isVisible = hideIfDisabled !== undefined ? !disabled : true;
    return (isVisible ?
        <button type="button"
            onClick={handleRequestResetDownload}
            disabled={disabled}
            className={className == undefined ? "flex flex-col items-center bg-orange-500 hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
            {
                children == undefined ? (
                    <>
                        <p>Delete Download</p>
                        <p>{modelRepo.replace(HF_MODEL_ENDS_WITH, "")}</p>
                        <p className="text-sm text-gray-300">({filePath})</p>
                    </>) :
                    children
            }
        </button> : <></>
    );
};

export default DeleteDownloadButton;