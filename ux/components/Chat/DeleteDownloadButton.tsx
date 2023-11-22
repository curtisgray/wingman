import React from "react";
import { DownloadButtonProps } from "@/types/download";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import { useDownloadService } from "@/hooks/useDownloadService";

const DeleteDownloadButton = ({ modelRepo, filePath, className = undefined, children = undefined, hideIfDisabled = undefined }: DownloadButtonProps) =>
{
    const downloadServer = useDownloadService();
    const downloadActions = useRequestDownloadAction();
    const handleRequestResetDownload = () => downloadActions.requestResetDownload(modelRepo, filePath);

    // only enable the button if the download item exists and the system is online
    const exists = downloadServer.item !== undefined;
    const isDisabled = (!downloadServer.isOnline || !exists);
    const isVisible = hideIfDisabled !== undefined ? !isDisabled : true;
    return (isVisible ?
        <button type="button"
            onClick={handleRequestResetDownload}
            disabled={isDisabled}
            className={className == undefined ? "flex flex-col items-center bg-orange-500 hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
            {
                children == undefined ? (
                    <>
                        <p>Delete Download</p>
                        <p>{modelRepo.replace("-GGUF", "")}</p>
                        <p className="text-sm text-gray-300">({filePath})</p>
                    </>) :
                    children
            }
        </button> : <></>
    );
};

export default DeleteDownloadButton;