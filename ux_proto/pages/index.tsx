/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { ReactNode, useEffect, useState } from "react";
import HomeContext from "./api/home/home.context";

import WingmanChart from "@/components/WingmanChart";
import { SelectModel } from "@/components/SelectModel";
import { DownloadProps, StripFormatFromModelRepo } from "@/types/download";
import { HomeInitialState, initialHomeState } from "./api/home/home.state";
import { useCreateReducer } from "@/hooks/useCreateReducer";
import WingmanRenderBox from "@/components/WingmanRenderBox";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import { WingmanItem, WingmanStateProps } from "@/types/wingman";
import { useWingman } from "@/hooks/useWingman";
import { initialWingmanState } from "./api/home/wingman.state";
import WingmanContext from "./api/home/wingman.context";

export default function Home()
{
    const inferencePort = 6567;
    const monitorPort = 6568;
    const [showDownloadedItemsOnly, setShowDownloadedItemsOnly] = useState<boolean>(false);
    const [chosenModel, setChosenModel] = useState<DownloadProps>({modelRepo: "", filePath: ""});
    const [currentInferenceItem, setCurrentInferenceItem] = useState<WingmanItem | undefined>(undefined);
    const [showMetrics, setShowMetrics] = useState<boolean>(true);
    const [showDownloads, setShowDownloads] = useState<boolean>(true);
    const [showHeader, setShowHeader] = useState<boolean>(true);

    const inferenceActions = useRequestInferenceAction();
    const isModelChosen = () => chosenModel !== undefined;

    const homeContextValue = useCreateReducer<HomeInitialState>({
        initialState: initialHomeState,
    });

    const {
        dispatch: homeDispatch,
    } = homeContextValue;

    const wingmanContextValue = useCreateReducer<WingmanStateProps>({
        initialState: initialWingmanState,
    });

    const {
        dispatch: wingmanDispatch,
    } = wingmanContextValue;

    const {
        alias,
        modelRepo,
        filePath,
        isGenerating,
        latestItem,
        items,
        pauseMetrics,
        timeSeries,
        meta,
        system,
        tensors,
        metrics,
        lastTime,
        isOnline,
        status: connectionStatus,
        wingmanServiceStatus,
        downloadServiceStatus,
        wingmanStatus,
        isInferring,
        wingmanItem,
        lastWebSocketMessage: lastWSMessage,

        forceChosenModel,
        activate,
        deactivate,
        startGenerating,
        stopGenerating,
        toggleMetrics,
    } = useWingman(inferencePort, monitorPort);

    useEffect(() =>
    {
        wingmanDispatch({ field: "alias", value: alias });
        wingmanDispatch({ field: "modelRepo", value: modelRepo });
        wingmanDispatch({ field: "filePath", value: filePath });
        wingmanDispatch({ field: "isGenerating", value: isGenerating });
        wingmanDispatch({ field: "latestItem", value: latestItem });
        wingmanDispatch({ field: "items", value: items });
        wingmanDispatch({ field: "pauseMetrics", value: pauseMetrics });
        wingmanDispatch({ field: "timeSeries", value: timeSeries });
        wingmanDispatch({ field: "meta", value: meta });
        wingmanDispatch({ field: "tensors", value: tensors });
        wingmanDispatch({ field: "system", value: system });
        wingmanDispatch({ field: "metrics", value: metrics });
        wingmanDispatch({ field: "lastTime", value: lastTime });
        wingmanDispatch({ field: "isOnline", value: isOnline });
        wingmanDispatch({ field: "status", value: connectionStatus });
        wingmanDispatch({ field: "wingmanServiceStatus", value: wingmanServiceStatus });
        wingmanDispatch({ field: "downloadServiceStatus", value: downloadServiceStatus });
        wingmanDispatch({ field: "wingmanStatus", value: wingmanStatus });
        wingmanDispatch({ field: "isInferring", value: isInferring });
        wingmanDispatch({ field: "wingmanItem", value: wingmanItem });
        wingmanDispatch({ field: "lastWebSocketMessage", value: lastWSMessage });

        wingmanDispatch({ field: "forceChosenModel", value: forceChosenModel });
        wingmanDispatch({ field: "activate", value: activate });
        wingmanDispatch({ field: "deactivate", value: deactivate });
        wingmanDispatch({ field: "startGenerating", value: startGenerating });
        wingmanDispatch({ field: "stopGenerating", value: stopGenerating });
        wingmanDispatch({ field: "toggleMetrics", value: toggleMetrics });
    }, [alias, modelRepo, filePath, isGenerating, latestItem, items, pauseMetrics, timeSeries, meta, system, tensors, metrics, lastTime, isOnline, connectionStatus, wingmanServiceStatus, downloadServiceStatus, wingmanStatus, isInferring, wingmanItem, lastWSMessage, forceChosenModel, activate, deactivate, startGenerating, stopGenerating, toggleMetrics]);

    function onInferenceItemsEvent(value: WingmanItem)
    {
        setCurrentInferenceItem(value);
    }

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

    const renderOfflineHeader = (): ReactNode =>
    {
        //🔄
        return (
            <>
                <p>{`Status: ${wingmanStatus === "complete" ? "inactive" : wingmanStatus}`} <span title="Wingman is offline">{connectionStatus}</span></p>
            </>
        );
    };

    const renderOnlineHeader = (): ReactNode =>
    {
        return (
            <>
                <p>{`Status: ${wingmanStatus === "complete" ? "inactive" : wingmanStatus}`} <span title="Wingman is online">{connectionStatus}</span> <span>{system.cuda_str}</span></p>
                <p>{system.gpu_name}</p>
                <p><span>{lastTime.toLocaleTimeString()}</span></p>
                {isModelChosen() && wingmanItem.modelRepo &&
                    <div className="text-xs">
                        <div><span className="text-violet-400 text-lg">{StripFormatFromModelRepo(wingmanItem.modelRepo)} {system.quantization ? system.quantization: ""} {system.has_next_token ? "🗣" : ""}</span></div>
                    </div>
                }
            </>);
    };

    const renderHeader = (): ReactNode =>
    {
        if (isOnline) {
            return renderOnlineHeader();
        } else {
            return renderOfflineHeader();
        }
    };

    const displayActivationButton = () =>
    {
        if (isModelChosen()) {
            if (currentInferenceItem?.status === "inferring") {
                return (
                    <button className="text-center rounded h-12 mt-4 p-4 bg-neutral-50 text-xs font-medium uppercase text-neutral-800"
                        onClick={handleStopInference}>{`deactivate (${currentInferenceItem.alias})`}</button>
                );
            } else if (currentInferenceItem?.status === "complete") {
                return (
                    <button className="text-center rounded h-12 mt-4 p-4 bg-neutral-50 text-xs font-medium uppercase text-neutral-800"
                        onClick={handleStartInference}>activate</button>
                );
            } else {
                return (
                    <button className="text-center rounded h-12 mt-4 p-4 bg-neutral-50 text-xs font-medium uppercase text-neutral-800"
                        onClick={handleStartInference}>{`${currentInferenceItem?.status}`}</button>
                );
            }
        }
        return (
            <div></div>
        );
    };

    useEffect(() =>
    {
        // get the last model chosen from browser storage
        const chosenModel = localStorage.getItem("chosenModel");
        if (chosenModel !== null) {
            const model = JSON.parse(chosenModel);
            setChosenModel(model);
            forceChosenModel(model.filePath, model.modelRepo, model.filePath);
        }
    }, []);

    useEffect(() =>
    {
        if (isModelChosen() && wingmanItem.alias === chosenModel?.filePath){
            onInferenceItemsEvent(wingmanItem);
        }
        // homeDispatch({ field: "lastWebSocketMessage", value: lastWSMessage });
    }, [wingmanItem]);

    // useEffect(() =>
    // {
    //     if (lastMessage?.data) {
    //         const message: WingmanWebSocket = {
    //             lastMessage: lastMessage.data,
    //             connectionStatus: connectionStatus as ConnectionStatus,
    //         };
    //         homeDispatch({ field: "lastWebSocketMessage", value: message });
    //         const json = JSON.parse(lastMessage.data);
    //         if (json?.isa === "WingmanItem") {
    //             if (isModelChosen() && json.alias === chosenModel?.filePath){
    //                 onInferenceItemsEvent(json);
    //             }
    //             if (json.system) {
    //                 setSystem(json.system);
    //             }
    //             if (json?.isa === "WingmanItem" && json?.alias === chosenModel?.filePath) {
    //                 const item = json as WingmanItem;
    //                 setWingmanStatus(item.status);
    //                 setIsInferring(item.status === "inferring");
    //                 setWingmanItem(item);
    //             }

    //             const date = new Date();
    //             setLastTime(date);
    //         }
    //     }
    // }, [lastMessage, connectionStatus]);

    const showGraph = false;
    return (
        <HomeContext.Provider value={{
            ...homeContextValue,
            handleUpdateConversation: () => {}
        }}>
            <main className={"flex flex-col justify-center h-screen w-screen items-center text-white bg-slate-900"}>
                <p className="pb-4 text-2xl uppercase">Wingman<span> (LOCAL)</span></p>
                <div>
                    <label>
                        <input type="checkbox" className="w-4 m-4" checked={showMetrics} onChange={(e) => setShowMetrics(!showMetrics)} />
                        Show Metrics
                    </label>
                    <label>
                        <input type="checkbox" className="w-4 m-4" checked={showDownloads} onChange={(e) => setShowDownloads(!showDownloads)} />
                        Show Downloads
                    </label>
                    <label>
                        <input type="checkbox" className="w-4 m-4" checked={showHeader} onChange={(e) => setShowHeader(!showHeader)} />
                        Show Header
                    </label>
                </div>
                {showHeader && <>
                    {renderHeader()}
                </>}
                {showDownloads && <>
                    <label className="mt-4 mb-0">Show downloaded items only
                        <input type="checkbox" className="w-4 m-4" checked={showDownloadedItemsOnly} onChange={(e) => setShowDownloadedItemsOnly(e.target.checked)} />
                    </label>
                    <SelectModel className="w-5/12 mb-4" chosenModel={chosenModel} showDownloadedItemsOnly={showDownloadedItemsOnly}
                        onChange={handleModelChange} />
                    {displayActivationButton()}
                </>}
                <WingmanContext.Provider value={{
                    ...wingmanContextValue,
                }}>
                    {showMetrics && <>
                        <WingmanChart className="w-3/5 m-4" showGraph={showGraph} chosenModel={chosenModel} />
                    </>}
                    <WingmanRenderBox className="w-3/5 h-96 m-4" chosenModel={chosenModel} />
                </WingmanContext.Provider>
            </main>
        </HomeContext.Provider>
    );
}
