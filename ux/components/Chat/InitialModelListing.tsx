import { useCallback, useContext, useEffect, useState } from 'react'
import { Tab } from '@headlessui/react'
import HomeContext from '@/pages/api/home/home.context'
import { AIModel, AIModelID, DownloadableItem, Vendors } from '@/types/ai';
import DownloadButton from './DownloadButton';
import WingmanContext from '@/pages/api/home/wingman.context';
import { displayClearedForTakeoff, displayDownloadInferringButton, displayErrorButton, displayModelMetrics, displayModelName, displayWaitButton } from './Util';

function classNames (...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

interface Props {
    onSelect?: (model: AIModel) => void;
    isDisabled?: boolean;
    iconSize?: number;
    initialModelId?: string;
}

interface ModelCategories {
    'Starting AI Model': AIModel[];
}

export default function InitialModelListing({ onSelect = () => { }, isDisabled: disabled = false, iconSize = 20, initialModelId = "TheBloke/phi-2-dpo" }: Props) {
    const [categories, setCategories] = useState<ModelCategories>({ 'Starting AI Model': [] });
    const [selectedTabIndex, setSelectedTabIndex] = useState(0)
    const [startingInference, setStartingInference] = useState(false);
    const [aliasBeingReset, setAliasBeingReset] = useState<string | undefined>(undefined)

    const {
        state: { models, globalModel, selectedConversation, isSwitchingModel },
        handleChangeModel,
        handleRefreshModels,
        handleResetInferenceError,
    } = useContext(HomeContext);

    const {
        state: { currentWingmanInferenceItem, isOnline, wingmanItems, inferringAlias, downloadItems },
    } = useContext(WingmanContext);

    // wrap createCategories in a useCallback to prevent it from being recreated on every render
    const createCategories = useCallback((models: AIModel[]) => {
        // filter the models to get the downloaded and OpenAI models
        let startingModels: AIModel[] = [];
        if (currentWingmanInferenceItem && currentWingmanInferenceItem.status === "inferring") {
            startingModels = models.filter((model) => {
                return model.isInferable && model.id === currentWingmanInferenceItem.modelRepo;
            });
        }

        if (startingModels.length === 0) {
            startingModels = models.filter((model) => {
                return Vendors[model.vendor].isDownloadable && model.id === initialModelId;
            });
        }

        return {
            'Starting AI Model': startingModels,
        }
    }, [initialModelId, currentWingmanInferenceItem]);

    const handleDownloadComplete = () => { };
    const handleDownloadStart = () => { };
    const handleDownloadInitialized = () => { };
    const handleStartInference = (model: AIModel, item: DownloadableItem | undefined) =>
    {
        setStartingInference(true);
        if (Vendors[model.vendor].isDownloadable) {
            if (item === undefined) throw new Error("item is undefined");
            const draftModel = { ...model };
            const draftItem = { ...item };
            draftItem.isDownloaded = true;
            draftModel.item = draftItem;
            handleChangeModel(draftModel);
        } else {
            handleChangeModel(model);
        }
    };
    const handleReset = (alias: string) =>
    {
        const inError = wingmanItems.some((wi) => wi.alias === alias);
        if (!inError) return;
        setAliasBeingReset(alias);
        handleResetInferenceError(alias);
        handleRefreshModels();
    };

    useEffect(() =>
    {
        if (startingInference) {
        }
    }, [startingInference]);

    useEffect(() => {
        setCategories(createCategories(models));
    }, [models, createCategories]);

    const isSelectedModelItem = (model: AIModel | undefined, item: DownloadableItem | undefined) =>
    {
        if (model === undefined || item === undefined || selectedConversation === undefined || selectedConversation.model === undefined) return false;
        if (model.id === AIModelID.NO_MODEL_SELECTED) return false;
        if (item.filePath === selectedConversation.model.item?.filePath) return true;
        return false;
    };

    const isItemInferring = (item: DownloadableItem | undefined) =>
    {
        return item?.filePath === inferringAlias;
    };

    const isAliasBeingReset = (alias: string) =>
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
    };

    const isItemDownloaded = (item: DownloadableItem | undefined) =>
    {
        if (item === undefined) return false;
        // look for the model in the downloadItems list
        let index = downloadItems.findIndex((i) => i.modelRepo === item.modelRepo);
        if (index === -1) return false;
        // look for the item by filePath in the downloadItems list
        index = downloadItems.findIndex((i) => i.filePath === item.filePath);
        if (index === -1) return false;
        return downloadItems[index].status === "complete";
    };

    useEffect(() =>
    {
        if (!startingInference) return;
        const waiting = isSwitchingModel || !inferringAlias || globalModel?.item?.filePath !== inferringAlias;
        if (!waiting) {
            setStartingInference(false);
        }
    }, [isSwitchingModel, inferringAlias, currentWingmanInferenceItem, startingInference, globalModel?.item?.filePath]);

    const displayDownloadInference = (model: AIModel) =>
    {
        // get the latest copy of the model from the models list
        const latestModel = models.find((m) => m.id === model.id);
        if (!latestModel)
            return displayErrorButton("No model");
        if (Vendors[latestModel.vendor].isDownloadable) {
            if (!latestModel.items)
                return displayErrorButton("No items");

            if (startingInference) return displayWaitButton();

            // TODO: handle the case where the user has downloaded multiple items
            let index = -1;
            if (latestModel.item)
                index = latestModel.items.findIndex((item) => item.quantization === latestModel.item?.quantization);
            if (index === -1)
                index = latestModel.items.findIndex((item) => item.isDownloaded);
            if (index === -1)
                index = Math.floor(
                    (latestModel.items?.length as number) / 2
                );
            const quantization = latestModel.items[index]?.quantization as string;
            const latestItem = latestModel.items.find((item) => item.quantization === quantization);
            if (!latestItem) return displayErrorButton("No item");
            if (isAliasBeingReset(latestItem.filePath)) return displayWaitButton();
            if (isItemDownloaded(latestItem)) {
                // a model can be inferring on the server, but not engaged. another model, say from an API, can be engaged
                //   even while the server is inferring a different model. thus we need to check for both cases
                // check if the model is currently engaged
                // check if the model is currently inferring on the server, but not engaged
                // check if the currently selected conversation is this model, if not, then the model is not engaged
                if (isItemInferring(latestItem)) {
                    if (isSelectedModelItem(latestModel, latestItem)) {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-orange-800 disabled:shadow-none disabled:cursor-default text-white py-2 rounded"
                                disabled
                            >
                                {displayDownloadInferringButton("Engaged")}
                            </button>
                        </div>;
                    } else {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-emerald-800 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                                onClick={() => handleStartInference(latestModel, latestItem)}
                            >
                                {displayDownloadInferringButton("Engage")}
                            </button>
                        </div>;
                    }
                } else if (latestItem.hasError) {
                    return <div className="self-center m-4">
                        <button type="button"
                            className="w-24 bg-rose-800 hover:bg-rose-600 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                            onClick={() => handleReset(latestItem.filePath)}
                        >
                            Reset
                        </button>
                    </div>;
                } else {
                    return <div className="self-center m-4">
                        <button type="button"
                            className="w-24 bg-gray-800 hover:bg-sky-800 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                            onClick={() => handleStartInference(latestModel, latestItem)}
                        >
                            Engage
                        </button>
                    </div>;
                }
            } else {
                return <div className="self-center m-4" style={disabled ? { pointerEvents: "none", opacity: "0.4" } : {}}>
                    <DownloadButton modelRepo={model.id}
                        filePath={latestItem.filePath}
                        showFileName={false}
                        showRepoName={false}
                        showProgressText={false}
                        onComplete={handleDownloadComplete}
                        onStarted={handleDownloadStart}
                        onInitialized={handleDownloadInitialized} />
                </div>;
            }
        } else {
            // if the global model is the same as the current model display 'Engaged', otherwise display 'Engage'
            if (globalModel?.id === model.id) {
                return <div className="self-center m-4">
                    <div className="w-24 bg-orange-600 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded">
                        Engaged
                    </div>
                </div>;
            } else {
                return <div className="self-center m-4" style={disabled ? { pointerEvents: "none", opacity: "0.4" } : {}}>
                    <button type="button" disabled={disabled}
                        className="w-24 bg-stone-800 hover:bg-stone-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                        onClick={() => handleStartInference(model, undefined)}
                    >
                        Engage
                    </button>
                </div>;
            }
        }
    };

    return (
        <div className='w-full px-2 py-4 sm:px-0 mt-4 mb-4'>
            <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
                <Tab.Panels className='mt-2'>
                    {Object.values(categories).map((items, idx) => (
                        <Tab.Panel
                            key={idx}
                            className={classNames(
                                'rounded-xl bg-white p-3 overflow-y-auto',
                                'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                            )}
                        >
                            {!isOnline &&
                                <div className="flex h-full justify-center items-center dark:text-gray-700 text-gray-400">
                                    <h3>Wingman is offline</h3>
                                </div>
                            }
                            {isOnline && (items.length === 0) && 
                                <div className="flex h-full justify-center items-center dark:text-gray-700 text-gray-400">
                                    <h3>Nothing to Show</h3>
                                </div>
                            }
                            {isOnline && (items.length > 0) && 
                                <ul>
                                    {items.map((item: AIModel) => (
                                        <li
                                            key={item.id}
                                            className='flex items-center justify-between hover:bg-gray-100'
                                        >
                                            <div className = 'relative rounded-md p-2'>
                                                <h3 className='text-base font-medium leading-5 dark:text-gray-700 text-gray-400'>
                                                    {displayModelName(item)}
                                                </h3>

                                                {displayModelMetrics(item)}
                                            </div>
                                            {displayClearedForTakeoff(item, "ml-auto")}
                                            {displayDownloadInference(item)}
                                        </li>
                                    ))}
                                </ul>
                            }
                        </Tab.Panel>
                    ))}
                </Tab.Panels>
            </Tab.Group>
        </div>
    )
}
