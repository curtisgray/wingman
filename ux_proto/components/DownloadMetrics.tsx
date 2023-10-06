/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { useDownloadServer } from "@/hooks/useDownloadServer";
import { ActiveDownloadItemStatuses, DownloadItem } from "@/types/download";

type DownloadMetricsBasicProps = {
    showRepoName?: boolean;
    showFileName?: boolean;
    showStatus?: boolean;
    showProgress?: boolean;
    showProgressText?: boolean;
    showActiveOnly?: boolean;
    className?: string;
};
const DownloadMetrics = ({
    showRepoName = true,
    showFileName = true,
    showStatus = true,
    showProgress = true,
    showProgressText = true,
    showActiveOnly = true,
    className = "",
}: DownloadMetricsBasicProps) =>
{
    // const { state: { downloadItems } } = useContext(HomeContext);
    const downloadServer = useDownloadServer();

    // determine if there are duplicate download items in the downloadItems array
    const dupes = downloadServer.downloadItem.filter((e) => downloadServer.downloadItem.filter((i) => i.modelRepo === e.modelRepo && i.filePath === e.filePath).length > 1);
    if (dupes.length > 1) {
        throw new Error(`DownloadMetrics: dupes.length === ${dupes.length}`);
    }

    const items = showActiveOnly ? downloadServer.downloadItem.filter(
        e => ActiveDownloadItemStatuses.includes(e.status)) : downloadServer.downloadItem;
    let activeDownloads: DownloadItem[] = [];

    activeDownloads = items.sort((a: DownloadItem, b: DownloadItem) => { return b.updated - a.updated; });
    return (
        <div className={className}>
            {activeDownloads.map((item) =>
            {
                return (
                    <div key={`${item.modelRepo}/${item.filePath}`} className="flex space-x-4">
                        <div className="flex flex-col">
                            {showRepoName && <p>Repo: {item.modelRepo}</p>}
                            {showFileName && <p>File: {item.filePath}</p>}
                            {showStatus && <p>Status: {item.status}</p>}
                            {showProgress && <progress
                                value={item.progress}
                                max="100"
                                className="mt-2 w-full"
                            ></progress>}
                            {showProgressText && ` ${item.progress.toPrecision(3)}% ${item.downloadSpeed} ${item.downloadedBytes} / ${item.totalBytes}`}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DownloadMetrics;
