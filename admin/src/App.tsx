import * as React from "react";
import { DownloadItem } from "types/download";
import { WingmanItem } from "types/wingman";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { IconClipboard, IconClipboardHeart, IconTrash } from "@tabler/icons-react";

export interface WingmanConfig
{
    inferencePort: number;
    controlPort: number;
    embeddingPort: number;
    serverHost: string;
}

export default () =>
{
    const [downloads, setDownloads] = React.useState<DownloadItem[]>([]);
    const [wingmanItems, setWingmanItems] = React.useState<WingmanItem[]>([]);
    const [clipboard, setClipboard] = React.useState<string>("");
    const [config, setConfig] = React.useState<WingmanConfig>({
        inferencePort: 6567,
        embeddingPort: 6567,
        controlPort: 6568,
        serverHost: "127.0.0.1"
    });

    const getWingmanControlServerUrl = () => `http://${config.serverHost}:${config.controlPort}`;
    const getWingmanInferenceServerUrl = () => `http://${config.serverHost}:${config.inferencePort}`;
    const getWingmanEmbeddingServerUrl = () => `http://${config.serverHost}:${config.embeddingPort}`;

    React.useEffect(() =>
    {
        const fetchData = async () =>
        {
            try {
                const wingmanItemsResponse = await fetch(`${getWingmanControlServerUrl()}/api/inference`);
                const wingmanItemsData = await wingmanItemsResponse.json() as { WingmanItems: WingmanItem[]; };
                const witems = wingmanItemsData["WingmanItems"];
                setWingmanItems(wingmanItemsData["WingmanItems"]);
                let wiActive: WingmanItem | undefined;
                if (witems.length > 0) {
                    const w = witems.find(w => (w.status === "inferring" || w.status === "preparing" || w.status === "queued"));
                    if (w) {
                        wiActive = w;
                    }
                }
                const downloadsResponse = await fetch(`${getWingmanControlServerUrl()}/api/downloads`);
                const downloadsData = await downloadsResponse.json() as { DownloadItems: DownloadItem[]; };
                const ditems = downloadsData["DownloadItems"];
                // sort downloads by created date
                ditems.sort((a, b) => b.created - a.created);
                // put the download that matches the active wingman item at the top
                if (wiActive) {
                    const wiActiveDownload = ditems.find(d => d.filePath === wiActive.alias);
                    if (wiActiveDownload) {
                        ditems.splice(ditems.indexOf(wiActiveDownload), 1);
                        ditems.unshift(wiActiveDownload);
                    }
                }
                setDownloads(ditems);
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

    const getClipboardFormat = (download: DownloadItem) =>
    {
        return `${download.modelRepo}/${download.filePath}`;
    };

    const isInClipboard = (download: DownloadItem) =>
    {
        return clipboard === getClipboardFormat(download);
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

    const stopInference = (wingmanItem: WingmanItem) =>
    {
        fetch(`http://localhost:6568/api/inference/stop?alias=${wingmanItem.alias}`, {
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
                console.log('Inference stopped:', data);
            })
            .catch(error =>
            {
                console.error('Error stopping inference:', error);
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
                <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded capitalize w-28 h-14 text-center"
                    onClick={() => stopInference(wi)}
                >
                    <div className="">Stop</div>
                    <div className="text-xs animate-pulse">{wi.status}</div>
                </button>
            );
        }
        return (
            <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded w-28 h-14 text-center"
                onClick={() => startInference(download)}>
                Activate
            </button>
        );
    };

    const displayClipboardButton = (download: DownloadItem) =>
    {
        if (isInClipboard(download)) {
            return (
                <IconClipboardHeart className="text-blue-950" />
            );
        }
        return (
            <CopyToClipboard text={getClipboardFormat(download)} onCopy={() => setClipboard(getClipboardFormat(download))}>
                <button><IconClipboard className="text-gray-500 hover:text-blue-700" /></button>
            </CopyToClipboard>
        );
    };

    return (
        <div className="h-screen w-screen flex flex-col p-8 items-center justify-center bg-gray-50">
            <h1 className="font-semibold text-xl pb-8">ODOBO</h1>
            <div className="flex flex-col items-center p-4 space-y-4 w-full overflow-y-auto bg-gray-100">
                {downloads.length > 0 &&
                    downloads.map((download) => (
                        <div className="flex justify-between w-3/4 items-center" key={download.filePath}>
                            <div className="flex items-center space-x-3 m-4">
                                <button onClick={() => deleteDownload(download)}>
                                    <IconTrash className="text-gray-500 hover:text-red-700" />
                                </button>
                                {displayClipboardButton(download)}
                            </div>
                            <div className="flex flex-col flex-1">
                                <p className="font-semibold">{download.modelRepo}</p>
                                <p className="text-sm">{download.filePath}</p>
                                <p className="text-sm">
                                    {getMetadataValue(download.metadata, "general.architecture")},
                                    {getMetadataValue(download.metadata, "context_length")},
                                    {getMetadataValue(download.metadata, "quantization")}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {displayActivateButton(download)}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
};
