import { useContext, useEffect, useState } from 'react'
import { Tab } from '@headlessui/react'
import HomeContext from '@/pages/api/home/home.context'
import { AIModel, AIModelID, DownloadableItem, Vendors } from '@/types/ai';
import DownloadButton from './DownloadButton';
import WingmanContext from '@/pages/api/home/wingman.context';
import { displayClearedForTakeoff, displayDownloadInferringButton, displayErrorButton, displayModelMetrics, displayModelName, displayWaitButton } from './Util';
import { Tooltip } from 'react-tooltip';

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
    // Popular: AIModel[];
    Trending: AIModel[];
    IQ: AIModel[];
    'Emotion IQ': AIModel[];
}

export default function ModelListing({ onSelect = () => { }, isDisabled: disabled = false, iconSize = 20 }: Props) {
    const listSize = 10;
    // const [categories, setCategories] = useState<ModelCategories>({ 'My Models': [], 'Recently Added': [], Popular: [], Trending: [] });
    const [categories, setCategories] = useState<ModelCategories>(
        {
            'My Models': [],
            'Recently Added': [],
            // Popular: [],
            Trending: [],
            IQ: [],
            'Emotion IQ': []
        }
    );
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [aliasBeingReset, setAliasBeingReset] = useState<string | undefined>(undefined);
    const [startingInference, setStartingInference] = useState<boolean>(false);

    const {
        state: { models, globalModel, selectedConversation, isSwitchingModel },
        handleChangeModel,
        handleRefreshModels,
        handleResetInferenceError,
    } = useContext(HomeContext);

    const {
        state: { currentWingmanInferenceItem, isOnline, downloadItems, inferringAlias, wingmanItems },
    } = useContext(WingmanContext);

    const handleDownloadComplete = () => {};
    const handleDownloadStart = () => {};
    const handleDownloadInitialized = () => {};
    const handleStartInference = (model: AIModel, item: DownloadableItem | undefined) => {
        if (Vendors[model.vendor].isDownloadable) {
            if (item === undefined) throw new Error("item is undefined");
            setStartingInference(true); // show starting inference button
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
            if (!isOnline) return { 
                'My Models': [],
                'Recently Added': [],
                // Popular: [],
                Trending: [],
                IQ: [],
                'Emotion IQ': []
            };

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
            // const popularModels = sortedModelsByDownloads.slice(0, listSize);
            // sort models by date and likes descending to derive trending models
            //  to do that we will take the 100 most recent models and sort them by likes
            const sortedModelsByLikes = sortedModelsByDate.slice(0, 50).sort((a, b) =>
            {
                return b.likes - a.likes;
            });
            // get the first listSize models
            const trendingModels = sortedModelsByLikes.slice(0, listSize);

            // sort models by IQ score descending, and remove models with a score less than or equal to 0
            const sortedModelsByIQ = models.filter((model) => model.iQScore > 0).sort((a, b) =>
            {
                return b.iQScore - a.iQScore;
            });

            const modelsByIQ = sortedModelsByIQ.slice(0, listSize);

            // sort models by 'Emotion IQ' score descending, and remove models with a score less than or equal to 0
            const sortedModelsByEQ = models.filter((model) => model.eQScore > 0).sort((a, b) =>
            {
                return b.eQScore - a.eQScore;
            });

            const modelsByEQ = sortedModelsByEQ.slice(0, listSize);

            return {
                'My Models': downloadedModels,
                'Recently Added': recentModels,
                // Popular: popularModels,
                Trending: trendingModels,
                IQ: modelsByIQ,
                'Emotion IQ': modelsByEQ,
            };
        };
        setCategories(createCategories(models));
    // });
    }, [models, isOnline, downloadItems, globalModel, currentWingmanInferenceItem]);

    useEffect(() =>
    {
        // Set up an interval that calls handleRefreshModels every 5 seconds
        const interval = setInterval(() =>
        {
            handleRefreshModels();
        }, 5000);

        // Return a cleanup function that clears the interval
        return () => clearInterval(interval);
    }, [handleRefreshModels]); // Pass handleRefreshModels as a dependency

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

    const itemHasError = (item: DownloadableItem | undefined) =>
    {
        // find item in wingmanItems and check the status
        if (item === undefined) return false;
        const wingmanItem = wingmanItems.find((wi) => wi.alias === item.filePath);
        if (wingmanItem === undefined) return false;
        return wingmanItem.status === "error";
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
        // if (selectedConversation?.model?.item?.filePath === undefined) return;
        if (globalModel?.item?.filePath === undefined || !inferringAlias) return;
        // const isInferring = selectedConversation?.model?.item?.filePath === inferringAlias;
        const isInferring = !isSwitchingModel && globalModel.item.filePath === inferringAlias;
        // const isInferring = !isSwitchingModel && globalModel?.item?.filePath === inferringAlias;
        // const waiting = isSwitchingModel || !inferringAlias || globalModel?.item?.filePath !== inferringAlias;
        // const waiting = isSwitchingModel || globalModel?.item?.filePath !== inferringAlias;
        // if (!waiting) {
        if (isInferring) {
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
            // match latestItem to a wingmanItem to see if it has an error
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
                                className="w-48 bg-orange-800 disabled:shadow-none disabled:cursor-default text-white py-2 rounded"
                                disabled
                            >
                                {displayDownloadInferringButton(
                                    <div className="flex flex-col">
                                        <div>Chosen AI Model</div>
                                    </div>
                                )}
                            </button>
                        </div>;
                    } else {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-48 bg-emerald-800 hover:bg-emerald-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                                onClick={() => handleStartInference(latestModel, latestItem)}
                            >
                                {displayDownloadInferringButton(
                                    <div className="flex flex-col">
                                        <div>Choose AI Model</div>
                                    </div>)}
                            </button>
                        </div>;
                    }
                // } else if (latestItem.hasError) {
                } else if (itemHasError(latestItem)) {
                    return <div className="self-center m-4">
                        <button type="button"
                            className="w-48 bg-rose-800 hover:bg-rose-600 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                            onClick={() => handleReset(latestItem.filePath)}
                        >
                            <div className="flex flex-col">
                                <div>Clear AI Error</div>
                            </div>
                        </button>
                    </div>;
                } else {
                    return <div className="self-center m-4">
                        <button type="button"
                            className="w-48 bg-gray-800 hover:bg-sky-800 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                            onClick={() => handleStartInference(latestModel, latestItem)}
                        >
                            <div className="flex flex-col">
                                <div>Activate AI Model</div>
                            </div>
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
                    <button type="button"
                        className="w-48 bg-orange-800 disabled:shadow-none disabled:cursor-default text-white py-2 rounded"
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
                        className="w-48 bg-stone-800 hover:bg-stone-600 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
                        onClick={() => handleStartInference(model, undefined)}
                    >
                        <div className="flex flex-col">
                            <div>Activate API</div>
                        </div>
                    </button>
                </div>;
            }
        }
    };

    const categoryTooltipId = (category: string) =>
    {
        return `category-${category}`;
    };

    const categoryTooltipContent = (category: string) =>
    {
        switch (category) {
            case 'My Models':
                return "Models that are available for inference";
            case 'Recently Added':
                return "Models that have been recently added";
            case 'Popular':
                return "Most downloads recently";
            case 'Trending':
                return "Most likes and downloads";
            case 'IQ':
                return "High LLM Benchmark scores";
            case 'Emotion IQ':
                return "High Emotional Intelligence scores";
            default:
                return "";
        }
    };
    
    return (
        <div className='w-full px-2 py-4 sm:px-0 mt-4 mb-4'>
            <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
                <Tab.List className='flex space-x-1 rounded bg-gray-900 dark:bg-blue-900/20 p-1'>
                    {Object.keys(categories).map(category => (
                        <>
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
                                data-tooltip-id={categoryTooltipId(category)}
                                data-tooltip-content={categoryTooltipContent(category)}
                                data-tooltip-delay-show={600}
                                data-tooltip-delay-hide={0}>
                                {category}
                            </Tab>
                            <Tooltip id={categoryTooltipId(category)} />
                        </>
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
