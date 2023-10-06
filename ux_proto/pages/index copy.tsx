import React from "react";
import { Inter } from "next/font/google";
import HomeContext from "@/pages/api/home/home.context";
import { useCreateReducer } from "@/hooks/useCreateReducer";
import { HomeInitialState, initialState } from "@/pages/api/home/home.state";
import { useEffect, useState } from "react";
import { useDownloadServer } from "@/hooks/useDownloadServer";
import { Conversation } from "@/types/chat";
import { updateConversation } from "@/utils/app/conversation";
import { KeyValuePair } from "@/types/data";
import WingmanChart from "@/components/WingmanChart";
import { useWingmanServer } from "@/hooks/useWingmanServer";
import { SelectModel } from "@/components/SelectModel";
import { AIModel } from "@/types/ai";
import WingmanRenderBox from "@/components/WingmanRenderBox";

const inter = Inter({ subsets: ["latin"] });

export default function Home()
{
    const contextValue = useCreateReducer<HomeInitialState>({
        initialState,
    });
    const [downloadServerOnlineStatus, setDownloadServerOnlineStatus] = useState<string>("❓");
    const [wingmanOnlineStatus, setWingmanOnlineStatus] = useState<string>("❓");
    const [selectedModel, setSelectedModel] = useState<AIModel | undefined>(undefined);
    const [forceInference, setForceInference] = useState<boolean>(false);
    // const [selectedDownloadedFileInfo, setSelectedDownloadedFileInfo] = useState<DownloadedFileInfo | undefined>(undefined);
    const { state: {
        conversations,
        // selectedConversation,
        models,
    }, dispatch } = contextValue;
    const handleUpdateConversation = (
        conversation: Conversation,
        data: KeyValuePair
    ) =>
    {
        const updatedConversation = {
            ...conversation,
            [data.key]: data.value,
        };

        const { single, all } = updateConversation(
            updatedConversation,
            conversations
        );

        dispatch({ field: "selectedConversation", value: single });
        dispatch({ field: "conversations", value: all });
    };
    // const downloads = [
    //     {
    //         modelRepo: "TheBloke/CodeLlama-7B-GGUF",
    //         filePath: "codellama-7b.Q2_K.gguf",
    //     },
    //     {
    //         modelRepo: "TheBloke/CodeLlama-7B-GGUF",
    //         filePath: "codellama-7b.Q4_K_M.gguf",
    //     }
    // ];

    const downloadServer = useDownloadServer();
    const wingmanServer = useWingmanServer();
    // wingmanServer.start("codellama-7b-2k", "codellama-7b.Q2_K.gguf");

    const startInference = () =>
    {
        if (selectedModel?.item === undefined) return;
        wingmanServer.start(selectedModel.item.modelRepo, selectedModel.item.modelRepo, selectedModel.item.filePath);
    };

    useEffect(() =>
    {
        // clear models list and repopulate
        // setDownloadServerOnlineStatus(downloadServer.isOnline ? `✅ (${downloadServer.serverStatus.status})` : "❌");
        // setWingmanOnlineStatus(wingmanServer.isOnline ? `✅ (${wingmanServer.serverStatus.status})` : "❌");
        setDownloadServerOnlineStatus(`${downloadServer.status} (${downloadServer.serverStatus.status})`);
        setWingmanOnlineStatus(`${wingmanServer.status} (${wingmanServer.serverStatus.status})`);
    }, [downloadServer.status, downloadServer.serverStatus.status,
        wingmanServer.status, wingmanServer.serverStatus.status]);
    useEffect(() =>
    {
        // clear models list and repopulate
        const getModels = () =>
        {
            fetch("/api/models")
                .then((response) =>
                {
                    if (!response.ok) {
                        console.log(`error getting models: ${response.statusText}`);
                    }else{
                        console.log(`getModels response: ${response?.statusText}`);
                        response.json()
                            .then((json) => dispatch({ field: "models", value: json }));
                    }
                }).catch((err) => console.log(`exception getting models: ${err}`));
        };
        getModels();
    }, []);

    const onModelChange = (model: AIModel) =>
    {
        console.log(`onModelChange: ${model.id}`);
        setSelectedModel(model);
        // if (model.item === undefined) return;
        // downloadServer.getDownloadItem(model.item.modelRepo, model.item.filePath).then((item) =>
        // {
        //     console.log(`getDownloadItem: ${item?.modelRepo}/${item?.filePath}`);
        //     setSelectedDownloadItem(item);
        // });
    };
    const onQuantizationChange = (model: AIModel) =>
    {
        console.log(`onQuantizationChange: ${model.item?.filePath}`);
        if (model.item === undefined) return;
        setSelectedModel(model);
        // downloadServer.getDownloadedFileInfo(model.item.modelRepo, model.item.filePath).then((item) =>
        // {
        //     console.log(`getDownloadedFileInfo: ${item?.modelRepo}/${item?.filePath}: ${JSON.stringify(item)}`);
        //     // setSelectedDownloadedFileInfo(item);
        // }).catch((err) => console.log(`getDownloadedFileInfo: ${err}`));
    };
    return (
        <HomeContext.Provider value={{
            ...contextValue,
            handleUpdateConversation,
        }}
        >
            <main className={`w-screen max-h-max flex flex-col items-center ${inter.className} text-gray-50 bg-slate-800`}>
                <div className="w-9/12 h-screen flex flex-col items-center justify-center space-y-8 m-8">
                    <div className="flex space-x-4">
                        <p className="">Downloader {downloadServerOnlineStatus}</p>
                        <p className="">Launcher {wingmanOnlineStatus}</p>
                    </div>
                    <div className="w-1/2 h-96 flex flex-col bg-slate-700 p-2 m-8 rounded items-center space-y-4">
                        <SelectModel className="w-full" models={models} model={selectedModel}
                            onModelChange={onModelChange} onQuantizationChange={onQuantizationChange}  />
                        {selectedModel?.item?.filePath !== undefined &&
                            <div className="flex flex-col space-y-2">
                                <button className="flex flex-col bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
                                    onClick={startInference}>
                                Run Model
                                </button>
                                <label>
                                    Force inference
                                    <input type="checkbox" className="form-checkbox h-5 w-5 text-gray-600" checked={forceInference} onChange={() => { setForceInference(!forceInference); }} />
                                </label>
                            </div>
                        }
                    </div>
                    <WingmanChart className="w-full" />
                    <WingmanRenderBox className="w-full h-48"/>
                </div>
            </main>
        </HomeContext.Provider>
    );
}
