import React, { useEffect, useState } from "react";
import { DownloadButtonProps, DownloadedFileInfo } from "@/types/download";
import { useDownloadServer } from "@/hooks/useDownloadServer";
import { useRequestDownloadAction } from "@/hooks/useRequestDownloadAction";

const DownloadButton = ({ modelRepo, filePath, showRepoName = true, showFileName = true, showProgress = true, showProgressText = true, className = undefined, children = undefined }: DownloadButtonProps) =>
{
    const downloadServer = useDownloadServer();
    const downloadActions = useRequestDownloadAction();
    const handleRequestDownload = () => downloadActions.requestDownload(modelRepo, filePath);
    const [downloadInfo, setDownloadInfo] = useState<DownloadedFileInfo | undefined>(undefined);

    let disabled = false;
    let downloadLabel = "Download";
    let progress = 0;
    let progressText = "";

    const item = downloadServer.item?.modelRepo === modelRepo && downloadServer.item?.filePath === filePath ? downloadServer.item : undefined;  
    if (item !== undefined) {
        switch (item.status) {
            case "complete":
                downloadLabel = "Downloaded";
                disabled = true;
                break;
            case "downloading":
                downloadLabel = "Downloading";
                disabled = true;
                progress = item.progress;
                progressText = `${item.progress.toPrecision(3)}% ${item.downloadSpeed}`;
                break;
            case "error":
                downloadLabel = "Error";
                break;
            case "idle":
                downloadLabel = "Download";
                disabled = true;
                break;
            case "queued":
                downloadLabel = "Queued";
                disabled = true;
                break;
            default:
                break;
        }
    }else{
        if (downloadInfo !== undefined) {
            downloadLabel = "Downloaded";
            disabled = true;
        }
    }

    const isDownloading = item !== undefined && item.status === "downloading";

    useEffect(() =>
    {
        downloadActions.getDownloadedFileInfo(modelRepo, filePath)
            .then((dfi) =>{
                if (dfi !== undefined)
                    setDownloadInfo(dfi);
            });
    }, [downloadActions, filePath, modelRepo]);

    return (
        <button type="button" disabled={disabled}
            onClick={handleRequestDownload}
            className={className == undefined ? "flex flex-col bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded" : className}>
            {
                children == undefined ?
                    (
                        <>
                            <p className="self-center">{downloadLabel}</p>
                            {showRepoName && <p>{modelRepo.replace("-GGUF", "")}</p>}
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