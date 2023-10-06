import React from "react";
import { ActiveDownloadItemStatuses, DownloadButtonProps } from "@/types/download";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import { useDownloadServer } from "@/hooks/useDownloadServer";

const CancelDownloadButton = ({ modelRepo, filePath, className = undefined, children = undefined, hideIfDisabled = undefined }: DownloadButtonProps) =>
{
    // const { state: { isOnline, downloadItems } } = useContext(HomeContext);
    const downloadServer = useDownloadServer();
    const downloadActions = useRequestDownloadAction();
    const handleRequestCancelDownload = () => downloadActions.requestCancelDownload(modelRepo, filePath);
    const dupes = downloadServer.downloadItem.filter(e => e.modelRepo === modelRepo && e.filePath === filePath);
    if (dupes.length > 1) {
        throw new Error("CancelDownloadButton: dupes.length === ${dupes.length}");
    }
    const item = downloadServer.downloadItem.find(e => e.modelRepo === modelRepo && e.filePath === filePath);

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