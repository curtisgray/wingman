import React from "react";
import { ActiveDownloadItemStatuses, DownloadButtonProps } from "@/types/download";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import { useDownloadService } from "@/hooks/useDownloadService";

const CancelDownloadButton = ({ modelRepo, filePath, className = undefined, children = undefined, hideIfDisabled = undefined }: DownloadButtonProps) =>
{
    // const { state: { isOnline, downloadItems } } = useContext(HomeContext);
    const downloadServer = useDownloadService();
    const downloadActions = useRequestDownloadAction();
    const handleRequestCancelDownload = () => downloadActions.requestCancelDownload(modelRepo, filePath);
    const item = downloadServer.item;

    // only enable the button if the download is in progress
    const isDownloading = item !== undefined && ActiveDownloadItemStatuses.includes(item.status);
    const isDisabled = !downloadServer.isOnline || !isDownloading;
    const isVisible = hideIfDisabled !== undefined ? !isDisabled : true;
    return (isVisible ?
        <button type="button"
            onClick={handleRequestCancelDownload}
            disabled={isDisabled}
            className={className == undefined ? "flex flex-col items-center bg-red-500 hover:bg-red-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
            {
                children == undefined ? (
                    <>
                        <p>Cancel Download</p>
                        <p>{modelRepo.replace("-GGUF", "")}</p>
                        <p className="text-sm text-gray-300">({filePath})</p>
                    </>) :
                    children
            }
        </button> : <></>
    );
};

export default CancelDownloadButton;