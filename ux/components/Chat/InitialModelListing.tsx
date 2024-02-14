import { useContext, useEffect, useState } from 'react'
import { Tab } from '@headlessui/react'
import HomeContext from '@/pages/api/home/home.context'
import { AIModel, Vendors } from '@/types/ai';
import DownloadButton from './DownloadButton';
import WingmanContext from '@/pages/api/home/wingman.context';
import { timeAgo } from '@/types/download';
import { IconApi, IconPlaneDeparture, IconPlaneOff } from '@tabler/icons-react';
import { Tooltip } from 'react-tooltip';

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

    const {
        state: { models, globalModel },
        handleChangeModel,
    } = useContext(HomeContext);

    const {
        state: { currentWingmanInferenceItem },
    } = useContext(WingmanContext);

    const isDownloadable = (model: AIModel) => {
        return Vendors[model.vendor].isDownloadable;
    };

    const createCategories = (models: AIModel[]): ModelCategories => {
        // filter the models to get the downloaded and OpenAI models
        const startingModels = models.filter((model) => {
            return Vendors[model.vendor].isDownloadable && model.id === initialModelId;
        });

        return {
            'Starting AI Model': startingModels,
        }
    };

    const handleDownloadComplete = () => {};
    const handleDownloadStart = () => {};
    const handleDownloadInitialized = () => {};
    const handleStartInference = (model: AIModel) => {
        if (Vendors[model.vendor].isDownloadable) {
            if (!model.items) return;
            const middleIndex = Math.floor(
                (model.items?.length as number) / 2
            );
            const quantization = model.items?.[middleIndex].quantization as string
            const item = model.items?.find((item) => item.quantization === quantization);
            if (!item) return;
            const draftModel = { ...model };
            const draftItem = { ...item };
            draftItem.isDownloaded = true;
            draftModel.item = draftItem;
            handleChangeModel(draftModel);
        } else {
            handleChangeModel(model);
        }
    };

    useEffect(() => {
        setCategories(createCategories(models));
    }, [models]);

    const displayModelName = (model: AIModel) => {
        if (Vendors[model.vendor].isDownloadable) {
            // split the repo owner and name and return 'name (repo owner)'
            const [owner, repo] = model.name.split('/');
            return <div className="flex space-x-1"><span>{repo}</span><span className="text-xs">{owner}</span></div>;
        } else {
            return <div className="flex space-x-1"><span>{model.name}</span></div>;
        }
    };

    const displayClearedForTakeoff = (model: AIModel) => {
        if (Vendors[model.vendor].isDownloadable) {
            if (model.isInferable) {
                return <div className="ml-auto text-sky-400">
                    <IconPlaneDeparture size={iconSize} data-tooltip-id="is-inferable" data-tooltip-content="Cleared for takeoff" />
                    <Tooltip id="is-inferable" />
               </div>;
            } else {
                return <div className="ml-auto text-neutral-400">
                    <IconPlaneOff size={iconSize} data-tooltip-id="is-not-inferable" data-tooltip-content="Not cleared for takeoff" />
                    <Tooltip id="is-not-inferable" />
                </div>;
            }
        } else {
            return <div className="ml-auto text-green-800">
                <IconApi size={iconSize} data-tooltip-id="is-api-inferred" data-tooltip-content="Always cleared for takeoff" />
                <Tooltip id="is-api-inferred" />
            </div>;
        }
    };

    const displayDownload = (model: AIModel) => {
        if (Vendors[model.vendor].isDownloadable) {
            if (!model.items) return;
            const middleIndex = Math.floor(
                (model.items?.length as number) / 2
            )
            const quantization = model.items?.[middleIndex]?.quantization as string
            const item = model.items?.find((item) => item?.quantization === quantization);
            if (!item) return <></>;
            if (item.isDownloaded) {
                // a model can be inferring on the server, but not engaged. another model, say from an API, can be engaged
                //   even while the server is inferring a different model. thus we need to check for both cases
                // check if the model is currently engaged
                let isEngaged = false;
                if (globalModel?.id === model.id) {
                    isEngaged = true;
                }
                // check if the model is currently inferring on the server, but not engaged
                if (currentWingmanInferenceItem?.modelRepo === model.id) {
                    if (isEngaged) {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-orange-800 hover:bg-orange-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-neutral-900 dark:text-white py-2 rounded"
                                disabled
                            >
                                Engaged
                            </button>
                        </div>
                    } else {
                        return <div className="self-center m-4">
                            <button type="button"
                                className="w-24 bg-emerald-800 hover:bg-emerald-500 disabled:shadow-none disabled:cursor-not-allowed text-neutral-900 dark:text-white py-2 rounded"
                                onClick={() => handleStartInference(model)}
                            >
                                Engage
                            </button>
                        </div>
                    }
                }
                return <div className="self-center m-4" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}}>
                    <button type="button" disabled={disabled}
                        className="w-24 bg-stone-800 hover:bg-stone-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-neutral-900 dark:text-white py-2 rounded"
                        onClick={() => handleStartInference(model)}
                    >Engage</button>
                </div>
            } else {
                return <div className="self-center m-4" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}}>
                    <DownloadButton modelRepo={model.id}
                        filePath={item.filePath}
                        showFileName={false}
                        showRepoName={false}
                        showProgressText={true}
                        onComplete={handleDownloadComplete}
                        onStarted={handleDownloadStart}
                        onInitialized={handleDownloadInitialized} />
                </div>;
            }
        } else {
            // if the global model is the same as the current model display 'Mission Underway', otherwise display 'Engage'
            if (globalModel?.id === model.id) {
                return <div className="self-center m-4">
                    <button type="button"

                        className="w-24 bg-orange-600 hover:bg-orange-600 disabled:shadow-none disabled:cursor-not-allowed text-neutral-900 dark:text-white py-2 rounded"
                        disabled
                    >
                        Engaged
                    </button>
                </div>
            } else {
                return <div className="self-center m-4" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}}>
                    <button type="button" disabled={disabled}
                        className="w-24 bg-stone-800 hover:bg-stone-500 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-neutral-900 dark:text-white py-2 rounded"
                        onClick={() => handleStartInference(model)}
                    >
                        Engage
                    </button>
                </div>
            }
        }
    };

    const displayModelMetrics = (item: AIModel) => {
        const vendor = Vendors[item.vendor];
        if (isDownloadable(item)) {
            return <>
                <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-neutral-400'>
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
                <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-neutral-400'>
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
                {/* <Tab.List className='flex space-x-1 rounded-xl bg-blue-900/20 p-1'>
                    {Object.keys(categories).map(category => (
                        <Tab
                            key={category}
                            className={({ selected }) =>
                                classNames(
                                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
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
                </Tab.List> */}
                <Tab.Panels className='mt-2'>
                    {Object.values(categories).map((items, idx) => (
                        <Tab.Panel
                            key={idx}
                            className={classNames(
                                'rounded-xl bg-white p-3 overflow-y-auto',
                                'ring-white/60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
                            )}
                        >
                            {(items.length === 0) && 
                                <div className="flex h-full justify-center items-center dark:text-neutral-700 text-neutral-400">
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
                                                <h3 className='text-base font-medium leading-5 dark:text-neutral-700 text-neutral-400'>
                                                    {displayModelName(item)}
                                                </h3>

                                                {displayModelMetrics(item)}
                                            </div>
                                            {displayClearedForTakeoff(item)}
                                            {displayDownload(item)}
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
