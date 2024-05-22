import * as React from "react";
import { DownloadItem } from "types/download";
import { WingmanItem } from "types/wingman";

export default () =>
{
    const [downloads, setDownloads] = React.useState<DownloadItem[]>([]);
    const [wingmanItems, setWingmanItems] = React.useState<WingmanItem[]>([]);

    React.useEffect(() =>
    {
        const fetchData = async () =>
        {
            try {
                const downloadsResponse = await fetch(
                    "http://localhost:6568/api/downloads"
                );
                const downloadsData = await downloadsResponse.json();
                setDownloads(downloadsData["DownloadItems"]);

                const wingmanItemsResponse = await fetch(
                    "http://localhost:6568/api/inference"
                );
                const wingmanItemsData = await wingmanItemsResponse.json();
                setWingmanItems(wingmanItemsData["WingmanItems"]);
            } catch (error) {
                console.error(error);
            }
        };

        fetchData();

        const intervalId = setInterval(fetchData, 5000); // Fetch data every 5 seconds

        return () => clearInterval(intervalId); // Clear interval on component unmount
    }, []);

    const getMetadataValue = (metadata: string | undefined, key: string): string =>
    {
        if (!metadata) {
            return "N/A";
        }
        try {
            const metadataObj = JSON.parse(metadata);
            return metadataObj[key] ? metadataObj[key].toString() : "N/A";
        } catch (e) {
            console.error('Error parsing metadata:', e);
            return 'N/A';
        }
    };

    const startInference = (download: DownloadItem) =>
    {
        fetch(`http://localhost:6568/api/inference/start?alias=${download.filePath}&modelRepo=${download.modelRepo}&filePath=${download.filePath}`, {
            method: 'GET'
        })
            .then(response =>
            {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data =>
            {
                // Handle the response from the server, e.g., update the UI
                console.log('Inference started:', data);
            })
            .catch(error =>
            {
                console.error('Error starting inference:', error);
            });
    };

    const deleteDownload = (download: DownloadItem) =>
    {
        fetch(`http://localhost:6568/api/downloads/remove?modelRepo=${download.modelRepo}&filePath=${download.filePath}`, {
            method: 'GET'
        })
            .then(response =>
            {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                // After successful deletion, refetch downloads
                return fetch("http://localhost:6568/api/downloads");
            })
            .then(response => response.json())
            .then(data => setDownloads(data["DownloadItems"]))
            .catch(error =>
            {
                console.error('Error deleting download:', error);
            });
    };

    const displayActivateButton = (download: DownloadItem) =>
    {
        let wi: WingmanItem | undefined;

        if (wingmanItems.length > 0) {
            const w = wingmanItems.find(wingmanItem => wingmanItem.alias === download.filePath);
            if (w) {
                if (w.status === "inferring" || w.status === "preparing" || w.status === "queued")
                    wi = w;
            }
        }
        if (wi) {
            return (
                <div className="bg-green-500 text-white font-bold py-2 px-4 rounded capitalize w-24 text-center">
                    {wi.status}
                </div>
            );
        }
        return (
            <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded w-24 text-center"
                onClick={() => startInference(download)}>
                Activate
            </button>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col p-8 items-center justify-center bg-gray-50">
            <h1 className="font-semibold text-xl pb-8">ODOBO</h1>
            <div className="flex flex-col items-center p-4 space-y-4 w-full overflow-y-auto bg-gray-100">
                {downloads.length > 0 &&
                    downloads.map((download) => (
                        <div className="flex justify-between w-3/4 items-center" key={download.filePath}>
                            <p>{download.modelRepo} 
                                ({download?.metadata && getMetadataValue(download.metadata, "general.architecture")}, {getMetadataValue(download.metadata, "context_length")})</p>
                            <div className="flex items-center space-x-2">
                                {displayActivateButton(download)}
                                <button
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-24 text-center"
                                    onClick={() => deleteDownload(download)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};
