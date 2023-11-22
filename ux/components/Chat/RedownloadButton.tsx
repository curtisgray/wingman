import React from "react";
import { DownloadButtonProps } from "@/types/download";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";
import { useDownloadService } from "@/hooks/useDownloadService";

const RedownloadButton = ({ modelRepo, filePath, className = undefined, children = undefined, hideIfDisabled = undefined }: DownloadButtonProps) =>
{
    // const { state: { isOnline, downloadItems } } = useContext(HomeContext);
    const downloadServer = useDownloadService();
    const downloadActions = useRequestDownloadAction();
    const handleRequestRedownload = () => downloadActions.requestRedownload(modelRepo, filePath);
    const item = downloadServer.item;

    // only enable the button if the download item exists and the system is online
    const exists = item !== undefined;
    const isDisabled = (!downloadServer.isOnline || !exists);
    const isVisible = hideIfDisabled !== undefined ? !isDisabled : true;
    return (isVisible ?
        <button type="button"
            onClick={handleRequestRedownload}
            disabled={isDisabled}
            className={className == undefined ? "flex flex-col items-center bg-orange-500 hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
            {
                children == undefined ? (
                    <>
                        <p>Redownload</p>
                        <p>{modelRepo.replace("-GGUF", "")}</p>
                        <p className="text-sm text-gray-300">({filePath})</p>
                    </>) :
                    children
            }
        </button> : <></>
    );
};

export default RedownloadButton;