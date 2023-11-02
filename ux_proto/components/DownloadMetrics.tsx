/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { useDownloadService } from "@/hooks/useDownloadService";
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
    const [items, setItems] = React.useState<DownloadItem[]>([]);
    const service = useDownloadService();

    React.useEffect(() =>
    {
        // add service.item to the list of items, carefully update any existing items
        if (service.item !== undefined) {
            const item = service.item;
            const index = items.findIndex(e => e.modelRepo === item.modelRepo && e.filePath === item.filePath);
            if (index >= 0) {
                // update the item
                items[index] = item;
                setItems([...items]);
            } else {
                setItems([...items, item]);
            }
        }
    }, [service.item]);

    const activeItems = showActiveOnly ? items.filter(
        e => ActiveDownloadItemStatuses.includes(e.status)) : items;
    let activeDownloads: DownloadItem[] = [];

    activeDownloads = activeItems.sort((a: DownloadItem, b: DownloadItem) => { return b.updated - a.updated; });
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
