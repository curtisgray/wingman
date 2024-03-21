import { useContext, useEffect, useState } from 'react'
import { Tab } from '@headlessui/react'
import HomeContext from '@/pages/api/home/home.context'
import { AIModel, AIModelID, DownloadableItem, Vendors } from '@/types/ai';
import DownloadButton from './DownloadButton';
import WingmanContext from '@/pages/api/home/wingman.context';
import { timeAgo } from '@/types/download';
import { IconApi, IconPlaneTilt, IconPlaneOff, IconPropeller, IconAperture } from '@tabler/icons-react';
import { Tooltip } from 'react-tooltip';
import { displayClearedForTakeoff, displayModelName } from './Util';

function classNames (...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

interface Props {
    onSelect?: (model: AIModel) => void;
    isDisabled?: boolean;
    iconSize?: number;
}

interface ModelCategories {
    'My Models': AIModel[];
    'Recently Added': AIModel[];
    Popular: AIModel[];
    Trending: AIModel[];
}

export default function ModelListing({ onSelect = () => { }, isDisabled: disabled = false, iconSize = 20 }: Props) {
    const listSize = 10;
    const [categories, setCategories] = useState<ModelCategories>({ 'My Models': [], 'Recently Added': [], Popular: [], Trending: [] });
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [startingInference, setStartingInference] = useState(false);
    const [aliasBeingReset, setAliasBeingReset] = useState<string | undefined>(undefined)

    const {
        state: { models, globalModel, selectedConversation },
        handleChangeModel,
        handleRefreshModels,
        handleResetInferenceError,
    } = useContext(HomeContext);

    const {
        state: { currentWingmanInferenceItem, isOnline, downloadItems, inferringAlias, wingmanItems },
    } = useContext(WingmanContext);

    const isDownloadable = (model: AIModel) => {
        return Vendors[model.vendor].isDownloadable;
    };

    const handleDownloadComplete = () => {};
    const handleDownloadStart = () => {};
    const handleDownloadInitialized = () => {};
    const handleStartInference = (model: AIModel, item: DownloadableItem | undefined) => {
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

    useEffect(() => {
        const createCategories = (models: AIModel[]): ModelCategories =>
        {
            if (!isOnline) return { 'My Models': [], 'Recently Added': [], Popular: [], Trending: [] };

            // filter the models to get the downloaded and OpenAI models
            let downloadedModels = models.filter((model) =>
            {
                return !Vendors[model.vendor].isDownloadable || model.items?.some((item) => item.isDownloaded);
            });
            // put any currently downloading models at the top of the `downloadedModels` list
            if (downloadItems) {
                const activeDownloads = downloadItems.filter((item) => item.status === 'queued' || item.status === 'downloading');
                activeDownloads.forEach((item) =>
                {
                    const model = models.find((model) => model.id === item.modelRepo);
                    if (model) {
                        downloadedModels = [model, ...downloadedModels];
                    }
                });
            }
            // put the inferring model at the top of the `downloadedModels` list, after any currently downloading models
            let inferringModel: AIModel | undefined = undefined;
            if (globalModel && globalModel.id !== AIModelID.NO_MODEL_SELECTED) {
                inferringModel = models.find((model) => model.id === globalModel.id);
                if (inferringModel) {
                    downloadedModels = [inferringModel, ...downloadedModels];
                    // remove duplicates
                    downloadedModels = downloadedModels.filter((model, index, self) => self.findIndex((m) => m.id === model.id) === index);
                }
            }
            if (!inferringModel) {
                if (currentWingmanInferenceItem && currentWingmanInferenceItem.status === "inferring") {
                    inferringModel = models.find((model) =>
                    {
                        return model.isInferable && model.id === currentWingmanInferenceItem.modelRepo;
                    });
                    if (inferringModel) {
                        downloadedModels = [inferringModel, ...downloadedModels];
                        // remove duplicates
                        downloadedModels = downloadedModels.filter((model, index, self) => self.findIndex((m) => m.id === model.id) === index);
                    }
                }
            }
            // filter the models to get the downloadable models
            const downloadableModels = models.filter((model) =>
            {
                return Vendors[model.vendor].isDownloadable;
            });
            // format the models into the categories
            // 1. Recent - sort the models by date and get the first listSize
            // 2. Popular - sort the models by downloads and get the first listSize
            // 3. Trending - sort the models by date and likes and get the first listSize
            // sort models by date descending
            const sortedModelsByDate = downloadableModels.sort((a, b) =>
            {
                // convert model.updated to date, then to a number and subtract
                return new Date(b.created).getTime() - new Date(a.created).getTime();
            });
            // get the first listSize models
            const recentModels = sortedModelsByDate.slice(0, listSize);
            // sort models by downloads descending
            const sortedModelsByDownloads = downloadableModels.sort((a, b) =>
            {
                return b.downloads - a.downloads;
            });
            // get the first listSize models
            const popularModels = sortedModelsByDownloads.slice(0, listSize);
            // sort models by date and likes descending to derive trending models
            //  to do that we will take the 100 most recent models and sort them by likes
            const sortedModelsByLikes = sortedModelsByDate.slice(0, 50).sort((a, b) =>
            {
                return b.likes - a.likes;
            });
            // get the first listSize models
            const trendingModels = sortedModelsByLikes.slice(0, listSize);

            return {
                'My Models': downloadedModels,
                'Recently Added': recentModels,
                Popular: popularModels,
                Trending: trendingModels,
            };
        };
        setCategories(createCategories(models));
    }, [models, isOnline, downloadItems, globalModel, currentWingmanInferenceItem]);

    useEffect(() =>
    {
        if (startingInference) {
        }
    }, [startingInference]);

    const isGlobalModelItem = (model: AIModel | undefined, item: DownloadableItem | undefined) =>
    {
        if (model === undefined || item === undefined || globalModel === undefined || globalModel.item === undefined) return false;
        if (model.id === AIModelID.NO_MODEL_SELECTED) return false;
        if (item.filePath === globalModel.item?.filePath) return true;
        return false;
    };

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

    const displayError = (label: string) =>
    {
        return <div className="self-center m-4">
            <button type="button"
                className="w-24 bg-yellow-500 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                disabled
            >
                label
            </button>
        </div>;
    };

    const displayWait = () =>
    {
        return <div className="self-center m-4">
            <div className="w-24 bg-yellow-950 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded">
                <div className="flex space-x-1 items-center justify-center">
                    <IconAperture className="animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="In flight" />
                    <span>Wait</span>
                </div>
            </div>
        </div>;
    };

    const displayDownloadInference = (model: AIModel) =>
    {
        // get the latest copy of the model from the models list
        const latestModel = models.find((m) => m.id === model.id);
        if (!latestModel)
            return displayError("No model");
        if (Vendors[latestModel.vendor].isDownloadable) {
            if (!latestModel.items)
                return displayError("No items");

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
            if (!latestItem) return displayError("No item");
            if (isAliasBeingReset(latestItem.filePath)) return displayWait();
            if (latestItem.isDownloaded) {
                // a model can be inferring on the server, but not engaged. another model, say from an API, can be engaged
                //   even while the server is inferring a different model. thus we need to check for both cases
                // check if the model is currently engaged
                // check if the model is currently inferring on the server, but not engaged
                if (isGlobalModelItem(latestModel, latestItem)) {
                    // check if the currently selected conversation is this model, if not, then the model is not engaged
                    if (isSelectedModelItem(latestModel, latestItem)) {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-orange-800 disabled:shadow-none disabled:cursor-default text-white py-2 rounded"
                                disabled
                            >
                                <div className="flex space-x-1 items-center justify-center">
                                    <IconPropeller className="animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="In flight" />
                                    <span>Engaged</span>
                                </div>
                            </button>
                        </div>;
                    } else {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-emerald-800 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                                onClick={() => handleStartInference(latestModel, latestItem)}
                            >
                                <div className="flex space-x-1 items-center justify-center">
                                    <IconPropeller className="animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="In flight" />
                                    <span>Engage</span>
                                </div>
                            </button>
                        </div>;
                    }
                } else {
                    if (isItemInferring(latestItem)) {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-emerald-800 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                                onClick={() => handleStartInference(latestModel, latestItem)}
                            >
                                <div className="flex space-x-1 items-center justify-center">
                                    <IconPropeller className="animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="In flight" />
                                    <span>Engage</span>
                                </div>
                            </button>
                        </div>;
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

    const displayModelMetrics = (item: AIModel) => {
        const vendor = Vendors[item.vendor];
        if (isDownloadable(item)) {
            return <>
                <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-gray-400'>
                    {/* <li>{new Date(item.updated).toLocaleDateString()}</li> */}
                    <li>{timeAgo(new Date(item.updated))}</li>
                    <li>&middot;</li>
                    <li>{item.downloads} downloads</li>
                    <li>&middot;</li>
                    <li>{item.likes} likes</li>
                </ul>
            </>
        } else {
            const tokenInKb = Math.round(item.tokenLimit / 1024);
            return <>
                <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-gray-400'>
                    <li>{vendor.displayName}</li>
                    <li>&middot;</li>
                    <li>context size {`${tokenInKb}K`}</li>
                </ul>
            </>
        }
    };

    return (
        <div className='w-full px-2 py-4 sm:px-0 mt-4 mb-4'>
            <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
                <Tab.List className='flex space-x-1 rounded bg-gray-900 dark:bg-blue-900/20 p-1'>
                    {Object.keys(categories).map(category => (
                        <Tab
                            key={category}
                            className={({ selected }) =>
                                classNames(
                                    'w-full rounded py-2.5 text-sm font-medium leading-5',
                                    'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                                    selected
                                        ? 'bg-white text-blue-700 shadow'
                                        : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                                )
                            }
                        >
                            {category}
                        </Tab>
                    ))}
                </Tab.List>
                <Tab.Panels className='mt-2'>
                    {Object.values(categories).map((items, idx) => (
                        <Tab.Panel
                            key={idx}
                            className={classNames(
                                'rounded-xl bg-white p-3 h-72 overflow-y-auto',
                                'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                            )}
                        >
                            {!isOnline &&
                                <div className="flex h-full justify-center items-center dark:text-gray-700 text-gray-400">
                                    <h3>Wingman is offline</h3>
                                </div>
                            }
                            {(items.length === 0) && 
                                <div className="flex h-full justify-center items-center dark:text-gray-700 text-gray-400">
                                    <h3>Nothing to Show</h3>
                                </div>
                            }
                            {(items.length > 0) && 
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
