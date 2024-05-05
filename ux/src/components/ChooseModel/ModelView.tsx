import { AIModel, AIModelID, DownloadableItem, Vendors } from "@/types/ai";
import { FC, useCallback, useContext, useEffect, useState } from "react";
import { ModelCard } from "./ModelCard";
import DownloadableItemSelect from "./DownloadableItemsSelect";
import HomeContext from "@/home.context";
import DownloadButton from "../Chat/DownloadButton";
import { displayErrorButton, displayWaitButton, displayDownloadInferringButton, displayClearedForTakeoff, bestItem } from "../Chat/Util";
import WingmanContext from "@/wingman.context";
import { prettyBytes } from "@/types/download";
import { useImmer } from "use-immer";

export type WingmanModelViewCommand = "download" | "activate";
interface Props
{
    model: AIModel;
    onSelected?: (item: DownloadableItem) => void;
    className?: string;
    disabled?: boolean;
}

export const ModelView: FC<Props> = ({ model: immutableModel, onSelected = undefined, className = undefined, disabled = false }) =>
{
    const [aliasBeingReset, setAliasBeingReset] = useState<string | undefined>(undefined);
    const [startingInference, setStartingInference] = useState<boolean>(false);
    // set model and item
    const [selectedModel, setSelectedModel] = useImmer<AIModel>(immutableModel);
    const [selectedItem, setSelectedItem] = useState<DownloadableItem | undefined>(selectedModel.item);

    const {
        state: { globalModel, selectedConversation, isSwitchingModel },
        handleChangeModel,
        handleRefreshModels,
        handleResetInferenceError,
    } = useContext(HomeContext);

    const {
        state: { currentWingmanInferenceItem, isOnline, downloadItems, inferringAlias, wingmanItems },
    } = useContext(WingmanContext);

    const handleDownloadComplete = useCallback(() => { }, []);
    const handleDownloadStart = useCallback(() => { }, []);
    const handleDownloadInitialized = useCallback(() => { }, []);
    const handleStartInference = useCallback((model: AIModel, item: DownloadableItem | undefined) =>
    {
        if (Vendors[model.vendor].isDownloadable) {
            if (item === undefined) throw new Error("item is undefined");
            setStartingInference(true); // show starting inference button
            handleChangeModel({ ...model, item: item });
        } else {
            handleChangeModel(model);
        }
    }, [handleChangeModel]);
    const handleReset = useCallback((alias: string) =>
    {
        const inError = wingmanItems.some((wi) => wi.alias === alias);
        if (!inError) return;
        setAliasBeingReset(alias);
        handleResetInferenceError(alias);
        handleRefreshModels();
    }, [handleResetInferenceError, handleRefreshModels, wingmanItems]);
    const handleItemSelection = useCallback((item: DownloadableItem) =>
    {
        setSelectedItem(item);
        onSelected?.(item);
    }, [onSelected]);
    const handleSelectModel = useCallback((model: AIModel) =>
    {
        if (model.id === AIModelID.NO_MODEL_SELECTED) return;
        if (model.items === undefined || model.items.length === 0) return;
        const item = bestItem(model.items);
        setSelectedModel(() => { return { ...model, item: item }; });
    }, [setSelectedModel]);

    const isSelectedModelItem = useCallback((model: AIModel, item: DownloadableItem | undefined) =>
    {
        if (model === undefined || item === undefined || selectedConversation === undefined || selectedConversation.model === undefined) return false;
        if (model.id === AIModelID.NO_MODEL_SELECTED) return false;
        if (item.filePath === selectedConversation.model.item?.filePath) return true;
        return false;
    }, [selectedConversation]);

    const isItemInferring = useCallback((item: DownloadableItem | undefined) =>
    {
        return item?.filePath === inferringAlias;
    }, [inferringAlias]);

    const isAliasBeingReset = useCallback((alias: string) =>
    {
        if (aliasBeingReset === undefined) return false;
        if (alias !== aliasBeingReset) return false;
        // when the alias is being reset it will show up in the wingmanItems list.
        //  when it disappears from the list, it is no longer in error
        const inError = wingmanItems.some((wi) => wi.alias === alias);
        if (!inError) {
            setAliasBeingReset(undefined);
        }
        return true;
    }, [aliasBeingReset, wingmanItems]);

    const itemHasError = useCallback((item: DownloadableItem | undefined) =>
    {
        // find item in wingmanItems and check the status
        if (item === undefined) return false;
        const wingmanItem = wingmanItems.find((wi) => wi.alias === item.filePath);
        if (wingmanItem === undefined) return false;
        return wingmanItem.status === "error";
    }, [wingmanItems]);

    const isItemDownloaded = useCallback((item: DownloadableItem | undefined) =>
    {
        if (item === undefined) return false;
        // look for the model in the downloadItems list
        let index = downloadItems.findIndex((i) => i.modelRepo === item.modelRepo);
        if (index === -1) return false;
        // look for the item by filePath in the downloadItems list
        index = downloadItems.findIndex((i) => i.filePath === item.filePath);
        if (index === -1) return false;
        return downloadItems[index].status === "complete";
    }, [downloadItems]);

    const itemMemRequired = useCallback((item: DownloadableItem | undefined) =>
    {
        return item?.normalizedQuantizedMemRequired ? prettyBytes(item.normalizedQuantizedMemRequired * 1024 * 1024) : "Unknown";
    }, []);

    const itemMemAvailable = useCallback((model: AIModel) =>
    {
        return model.availableMemory ? prettyBytes(model.availableMemory * 1024 * 1024) : "Unknown";
    }, []);

    const displayDownloadInference = useCallback((item: DownloadableItem | undefined) =>
    {
        if (!selectedModel)
            return displayErrorButton("No model");
        if (Vendors[selectedModel.vendor].isDownloadable) {
            if (!selectedModel.items)
                return displayErrorButton("No items");

            if (isSwitchingModel) return displayWaitButton();

            // TODO: handle the case where the user has downloaded multiple items
            let index = -1;
            if (selectedModel.item)
                index = selectedModel.items.findIndex((item) => item.quantization === selectedModel.item?.quantization);
            if (index === -1)
                index = selectedModel.items.findIndex((item) => item.isDownloaded);
            if (index === -1)
                index = Math.floor(
                    (selectedModel.items?.length as number) / 2
                );
            // const quantization = model.items[index]?.quantization as string;
            // match latestItem to a wingmanItem to see if it has an error
            if (!item) return displayErrorButton("No item");
            if (isAliasBeingReset(item.filePath)) return displayWaitButton();
            if (isItemDownloaded(item)) {
                // a model can be inferring on the server, but not engaged. another model, say from an API, can be engaged
                //   even while the server is inferring a different model. thus we need to check for both cases
                // check if the model is currently engaged
                // check if the model is currently inferring on the server, but not engaged
                // check if the currently selected conversation is this model, if not, then the model is not engaged
                if (isItemInferring(item)) {
                    if (isSelectedModelItem(selectedModel, item)) {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-44 bg-orange-800 disabled:shadow-none disabled:cursor-default text-white py-2 rounded"
                                disabled
                            >
                                {displayDownloadInferringButton(
                                    <div className="flex flex-col">
                                        <div>AI is Active</div>
                                    </div>
                                )}
                            </button>
                        </div>;
                    } else {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-44 bg-emerald-800 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                                onClick={() => handleStartInference(selectedModel, item)}
                                disabled={isSwitchingModel}
                            >
                                {displayDownloadInferringButton(
                                    <div className="flex flex-col">
                                        <div>Choose AI</div>
                                    </div>
                                )}
                            </button>
                        </div>;
                    }
                } else if (itemHasError(item)) {
                    return <div className="self-center m-4">
                        <button type="button"
                            className="w-44 bg-rose-800 hover:bg-rose-600 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                            onClick={() => handleReset(item.filePath)}
                            disabled={isSwitchingModel}
                        >
                            <div className="flex flex-col">
                                <div>Clear AI Error</div>
                            </div>
                        </button>
                    </div>;
                } else {
                    return <div className="self-center m-4">
                        <button type="button"
                            className="w-44 bg-gray-800 hover:bg-sky-800 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                            onClick={() => handleStartInference(selectedModel, item)}
                            disabled={isSwitchingModel}
                        >
                            <div className="flex flex-col">
                                <div>Activate AI</div>
                            </div>
                        </button>
                    </div>;
                }
            } else {
                return <div className="w-44 self-center m-4" style={disabled ? { pointerEvents: "none", opacity: "0.4" } : {}}>
                    <DownloadButton modelRepo={selectedModel.id}
                        filePath={item.filePath}
                        showFileName={false}
                        showRepoName={false}
                        showProgressText={false}
                        onComplete={handleDownloadComplete}
                        onStarted={handleDownloadStart}
                        onInitialized={handleDownloadInitialized} />
                </div>;
            }
        } else {
            // if the global model is the same as the current model display 'Engaged', otherwise display 'Activate AI'
            if (globalModel?.id === selectedModel.id) {
                return <div className="self-center m-4">
                    <button type="button"
                        className="w-44 bg-orange-800 disabled:shadow-none disabled:cursor-default text-white py-2 rounded"
                        disabled
                    >
                        {displayDownloadInferringButton(
                            <div className="flex flex-col">
                                <div>Activate API</div>
                            </div>,
                            false)}
                    </button>
                </div>;
            } else {
                return <div className="self-center m-4" style={disabled ? { pointerEvents: "none", opacity: "0.4" } : {}}>
                    <button type="button" disabled={disabled}
                        className="w-44 bg-stone-800 hover:bg-stone-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                        onClick={() => handleStartInference(selectedModel, undefined)}
                    >
                        <div className="flex flex-col">
                            <div>Activate API</div>
                        </div>
                    </button>
                </div>;
            }
        }
    }, [selectedModel, isSwitchingModel, globalModel, isSelectedModelItem, isItemInferring, isAliasBeingReset, itemHasError, isItemDownloaded, handleDownloadComplete, handleDownloadStart, handleDownloadInitialized, handleStartInference, handleReset, disabled]);

    useEffect(() =>
    {
        if (!startingInference) return;
        if (globalModel?.item?.filePath === undefined || !inferringAlias) return;
        const isInferring = !isSwitchingModel && globalModel.item.filePath === inferringAlias;
        if (isInferring) {
            setStartingInference(false);
        }
    }, [isOnline, isSwitchingModel, inferringAlias, currentWingmanInferenceItem, startingInference, globalModel?.item?.filePath]);

    useEffect(() =>
    {
        if (isOnline) {
            handleRefreshModels();
        } else {
            setStartingInference(false);
        }
    }, [handleRefreshModels, isOnline]);

    // set the item on the selected model when the item changes
    useEffect(() =>
    {
        if (selectedItem) {
            setSelectedModel((draft) => { draft.item = selectedItem; });
        }
    }, [selectedItem]);

    // set the selected model and item when the passed in model (immutableModel) changes
    useEffect(() =>
    {
        handleSelectModel(immutableModel);
    }, [handleSelectModel, immutableModel, immutableModel.items, immutableModel.item]);

    // set the selected model and item when the component is first rendered
    useEffect(() =>
    {
        handleSelectModel(immutableModel);
    }, []);

    if (selectedModel === undefined || selectedModel.id === AIModelID.NO_MODEL_SELECTED) return <></>;
    if (selectedModel.items === undefined || selectedModel.items.length === 0) return displayErrorButton("No items");

    return (
        <div className={`${className} flex justify-between`}>
            <div className="flex flex-col space-y-4 pr-4">
                <DownloadableItemSelect className="pl-2 pt-4" items={selectedModel.items!} defaultItem={selectedModel.item} onSelect={handleItemSelection} />
                <div className="flex flex-col space-y-4 border p-2">
                    <label className="block text-sm font-semibold text-gray-700">Optimization Details</label>
                    <div className="flex flex-col space-x-4">
                        <div className="flex">
                            {displayClearedForTakeoff(selectedModel, "ml-auto", true, true)}
                            {displayDownloadInference(selectedModel.item)}
                        </div>
                        <div className="">
                            <p>Memory Required: {`${itemMemRequired(selectedModel.item)}`}</p>
                            <p>Memory Available: {`${itemMemAvailable(selectedModel)}`}</p>
                        </div>
                    </div>
                </div>
            </div>
            <ModelCard model={selectedModel} className='self-center' />
        </div>
    );
};
