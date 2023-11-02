/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from "react";
import WingmanChart from "@/components/WingmanChart";
// import WingmanRenderBox from "@/components/WingmanRenderBox";
import { SelectModel } from "@/components/SelectModel";
import { AIModel, AIModels } from "@/types/ai";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { ConnectionStatus, DownloadProps, WingmanWebSocket } from "@/types/download";
import { HomeInitialState, initialState } from "./api/home/home.state";
import { useCreateReducer } from "@/hooks/useCreateReducer";
import HomeContext from "./api/home/home.context";
import WingmanRenderBox from "@/components/WingmanRenderBox";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import { WingmanItem } from "@/types/wingman";

export default function Home()
{
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [showDownloadedItemsOnly, setShowDownloadedItemsOnly] = useState<boolean>(false);
    const [chosenModel, setChosenModel] = useState<DownloadProps | undefined>(undefined);
    const [currentInferenceItem, setCurrentInferenceItem] = useState<WingmanItem | undefined>(undefined);
    const contextValue = useCreateReducer<HomeInitialState>({
        initialState,
    });

    const inferenceActions = useRequestInferenceAction();
    const isModelChosen = () => chosenModel !== undefined;

    const {
        state: {
            // isOnline,
            // lastWebSocketMessage,
            // downloadItems,
            // wingmanItems,
            
            // downloadServiceStatus,
            // inferenceServiceStatus,

            models,
        },
        dispatch,
    } = contextValue;
    const {
        lastMessage,
        readyState,
    } = useWebSocket("ws://localhost:6568",
        {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            shouldReconnect: (_closeEvent) => true,
            reconnectAttempts: 9999999,
            reconnectInterval: 1000,
        });
    const connectionStatus = {
        [ReadyState.CONNECTING]: "🔄",
        [ReadyState.OPEN]: "✅",
        [ReadyState.CLOSING]: "⏳",
        [ReadyState.CLOSED]: "❌",
        [ReadyState.UNINSTANTIATED]: "❓",
    }[readyState];

    function onInferenceItemsEvent(value: WingmanItem)
    {
        if (value.status === "inferring"){
            setCurrentInferenceItem(value);
        } else {
            setCurrentInferenceItem(undefined);
        }
    }

    useEffect(() =>
    {
        // getModels()
        //     .catch((err) => console.log(`exception getting models: ${err}`));
        // TODO: set a timer to refresh the models every few minutes

        // get the last model chosen from browser storage
        const chosenModel = localStorage.getItem("chosenModel");
        if (chosenModel !== null) {
            const model = JSON.parse(chosenModel);
            setChosenModel(model);
        }
    }, []);

    useEffect(() =>
    {
        if (lastMessage?.data) {
            const message: WingmanWebSocket = {
                lastMessage: lastMessage.data,
                connectionStatus: connectionStatus as ConnectionStatus,
            };
            dispatch({ field: "lastWebSocketMessage", value: message });
            const json = JSON.parse(lastMessage.data);
            if (json?.isa === "WingmanItem") {
                if (isModelChosen() && json.alias === chosenModel?.filePath){
                    onInferenceItemsEvent(json);
                }
            }
        }
    }, [lastMessage, connectionStatus]);

    const handleModelChange = (model: DownloadProps | undefined) =>
    {
        if (model !== undefined) {
            // set chosen model locally and in browser storage
            setChosenModel(model);
            localStorage.setItem("chosenModel", JSON.stringify(model));
        }
    };
    const handleStartInference = () =>
    {
        if (isModelChosen())
            inferenceActions.requestStartInference(chosenModel!.filePath, chosenModel!.modelRepo, chosenModel!.filePath, -1);
    };
    const handleStopInference = () =>
    {
        if (isModelChosen())
            inferenceActions.requestStopInference(chosenModel!.filePath);
    };

    const displayActivationButton = () =>
    {
        if (isModelChosen()) {
            if (currentInferenceItem === undefined) {
                return (
                    <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase text-neutral-800"
                        onClick={handleStartInference}>{`activate`}</button>
                );
            }
            return (
                <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase text-neutral-800"
                    onClick={handleStopInference}>{`deactivate`}</button>
            );
        }
        return (
            <div></div>
        );
    };

    return (
        <HomeContext.Provider value={{
            ...contextValue,
            handleUpdateConversation: () => {}
        }}>
            <main className={"flex flex-col justify-center h-screen w-screen items-center text-white bg-slate-900"}>
                <p className="pb-4 text-2xl uppercase">Wingman<span></span></p>
                <label className="">Show downloaded items only
                    <input type="checkbox" className="w-4 m-4" checked={showDownloadedItemsOnly} onChange={(e) => setShowDownloadedItemsOnly(e.target.checked)} />
                </label>
                <SelectModel className="w-5/12 m-4" chosenModel={chosenModel} showDownloadedItemsOnly={showDownloadedItemsOnly}
                    onChange={handleModelChange} />
                {displayActivationButton()}
                <WingmanChart className="w-3/5 m-4" />
                <WingmanRenderBox className="w-3/5 h-96 m-4" />
            </main>
        </HomeContext.Provider>
    );
}
