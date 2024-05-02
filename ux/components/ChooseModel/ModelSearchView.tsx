import { ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { AIModel, AIModelID, AIModels, DownloadableItem, Vendors } from '@/types/ai';
import { WINGMAN_OFFLINE_MESSAGE, displayClearedForTakeoff, displayLoadingDataMessage, displayLoadingMessage, displayModelMetrics, displayModelName, largestInferableItem } from '../Chat/Util';
import { Tooltip } from 'react-tooltip';
import { IconCircleCheck, IconPlaneTilt } from '@tabler/icons-react';
// import { t } from 'i18next';
import { t } from '@/utils/app/i18';
import ReactPaginate from 'react-paginate';
import { ModelView } from './ModelView';
import WingmanContext from '@/pages/api/home/wingman.context';
import { useImmer } from 'use-immer';
import { getWingmanItemStatusMessage } from '@/types/wingman';

interface Props
{
    onSelect?: (model: AIModel) => void;
    disabled?: boolean;
    iconSize?: number;
    className?: string;
}

export default function ModelSearchView({ onSelect = undefined, disabled = false, iconSize = 20, className = undefined }: Props)
{
    const [selectedModel, setSelectedModel] = useImmer<AIModel>(AIModels[AIModelID.NO_MODEL_SELECTED]);
    const [selectableModels, setSelectableModels] = useImmer<AIModel[]>([]);
    const [filteredModels, setFilteredModels] = useImmer<AIModel[]>([]);
    const [downloadableModels, setDownloadableModels] = useImmer<AIModel[]>([]);
    const [isComponentLoaded, setIsComponentLoaded] = useState<boolean>(false);
    const [isComponentInitialized, setIsComponentInitialized] = useState<boolean>(false);
    const [showDownloadedItemsOnly, setShowDownloadedItemsOnly] = useState<boolean>(false);
    const [showReadyForTakeoffOnly, setShowReadyForTakeoffOnly] = useState<boolean>(false);
    const [pageSize, setPageSize] = useState<number>(10);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const selectedModelRef = useRef<HTMLLIElement>(null);

    const {
        state: { models, isSwitchingModel, globalModel },
    } = useContext(HomeContext);

    const {
        state: { isOnline, downloadItems, currentWingmanInferenceItem, inferringAlias, wingmanItems },
    } = useContext(WingmanContext);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) =>
    {
        setSearchTerm(event.target.value);
    };

    const handleSelectModel = useCallback((model: AIModel) =>
    {
        if (model) {
            // If model.item is undefined, set the selectedItem to the
            // largest item in the model.items array that's inferable
            setSelectedModel(draft =>
            {
                if (model.item === undefined) {
                    const inferrable = largestInferableItem(model.items);
                    Object.assign(draft, model, { item: inferrable });
                } else {
                    Object.assign(draft, model);
                }
            });
        }
    }, [setSelectedModel]);

    const handleSelectItem = useCallback((item: DownloadableItem) =>
    {
        // setSelectedModel(draft =>
        // {
        //     draft.item = item;
        // });
    }, [setSelectedModel]);

    const displayShowDetails = useCallback((model: AIModel): ReactNode =>
    {
        const wi = wingmanItems.find((wi) => wi.modelRepo === model.id);

        const buttonColor = () =>
        {
            if (wi) {
                if (wi.status === "inferring") return "bg-orange-800 cursor-auto";
                if (wi.status === "error") return "bg-rose-800";
                return "bg-gray-700";
            }
            if (model.id === selectedModel?.id) return "bg-gray-800";
            return "bg-gray-800";
        }

        const displayDetails = (model: AIModel) =>
        {
            if (wi) {
                return getWingmanItemStatusMessage(wi);
            } else if (model.id === selectedModel?.id) {
                return <div>...</div>;
            } else {
                return <div>Show Details</div>;
            }
        };
        
        return <div className="self-center m-4">
            <button type="button"
                className={`w-36 ${buttonColor()} ${model.id === selectedModel?.id ? 'cursor-auto' : 'hover:bg-sky-800'} disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded`}
                onClick={() => handleSelectModel(model)}
                disabled={isSwitchingModel}
            >
                <div className="flex flex-col">
                    {displayDetails(model)}
                </div>
            </button>
        </div>;
    }, [selectedModel?.id, isSwitchingModel, handleSelectModel]);

    useEffect(() =>
    {
        if (!models || models.length === 0) return;
        const handleSetDownloadableModels = async () =>
        {
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
            setDownloadableModels(draft =>
            {
                draft.length = 0; // Clear existing contents
                draft.push(...downloadedModels); // Add new downloadable models
            });
        };
        const handleSetSelectableModels = async () =>
        {
            const searchFilter = searchTerm.length > 0 ? models.filter((model) =>
                model.name.toLowerCase().includes(searchTerm.toLowerCase()))
                : models;

            const downloadsFilter = showDownloadedItemsOnly ? searchFilter.filter((model) =>
                (Vendors[model.vendor].isDownloadable && model.items?.some((item) => item.isDownloaded)) ||
                (!Vendors[model.vendor].isDownloadable))
                : searchFilter;

            const readyForTakeOffFilter = showReadyForTakeoffOnly ? searchFilter.filter((model) =>
                (Vendors[model.vendor].isDownloadable && model.isInferable) ||
                (!Vendors[model.vendor].isDownloadable))
                : searchFilter;

            // Combine the filters
            const filtered = downloadsFilter.filter((model) => readyForTakeOffFilter.includes(model));

            // Sort if necessary
            filtered.sort((a, b) =>
            {
                if (a.items?.some((item) => item.isDownloaded) && !b.items?.some((item) => item.isDownloaded)) return -1;
                if (!a.items?.some((item) => item.isDownloaded) && b.items?.some((item) => item.isDownloaded)) return 1;
                return 0;
            });

            setFilteredModels(draft =>
            {
                draft.length = 0; // Clear existing contents
                draft.push(...filtered); // Add new filtered models
            });

            const pageCount = Math.ceil(filtered.length / pageSize);
            if (totalPages !== pageCount) setCurrentPage(1);
            setTotalPages(pageCount);
            let startIndex = ((currentPage - 1) * pageSize) + currentPage;
            let endIndex = startIndex + pageSize;
            const selectable = filtered.slice(startIndex, endIndex);
            setSelectableModels(draft =>
            {
                draft.length = 0; // Clear existing contents
                draft.push(...selectable); // Add new selectable models
            });

            setIsComponentLoaded(true);
        };
        handleSetSelectableModels();
        // handleSetDownloadableModels();
    }, [models, showDownloadedItemsOnly, showReadyForTakeoffOnly, pageSize, currentPage, searchTerm]);

    // When the component loads, set the selected model to the globalModel,
    //   set the current page to the globalModel's page, and set the selected optimization
    useEffect(() =>
    {
        if (!isComponentLoaded || isComponentInitialized) return;

        setSelectedModel(draft =>
        {
            if (globalModel) {
                if (globalModel.id === AIModelID.NO_MODEL_SELECTED) {
                    draft = globalModel;
                } else if (globalModel.id !== AIModelID.NO_MODEL_SELECTED) {
                    const index = filteredModels.findIndex(model => model.id === globalModel.id);
                    if (index !== -1) {
                        draft = globalModel;
                        setCurrentPage(Math.floor(index / pageSize));
                    } else {
                        draft = AIModels[AIModelID.NO_MODEL_SELECTED];
                    }
                } else {
                    draft = AIModels[AIModelID.NO_MODEL_SELECTED];
                }
            } else {
                draft = AIModels[AIModelID.NO_MODEL_SELECTED];
            }
            setIsComponentInitialized(true);
        });
    }, [isComponentLoaded, isComponentInitialized, globalModel, filteredModels, pageSize, setSelectedModel]);

    useEffect(() =>
    {
        if (selectedModelRef.current) {
            selectedModelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedModel]);

    if (!isComponentInitialized) return <></>;

    return (
        <div className={`${className}`}>
            <div className='flex flex-col space-y-4 h-full pt-8'>
                <div className="flex flex-col space-y-4">
                    <div className="flex">
                        <label className="text-left text-gray-700 dark:text-gray-400">
                            {t("To activate any available AI, use the search box below.")}
                        </label>
                    </div>
                </div>

                <div className="flex flex-col space-y-4">
                    <div className="flex flex-col space-y-4">
                        <div className="flex space-x-8">
                            <div className="flex items-center" data-tooltip-id="show-downloaded-only" data-tooltip-content="Show only AI's that have already been downloaded">
                                <label htmlFor="showDownloadedItemsOnly">
                                    <div>
                                        {/* <div className="text-green-700"> */}
                                        {/* <IconCircleCheck size={iconSize} /> */}
                                        Show Downloaded Only
                                        <Tooltip id="show-downloaded-only" />
                                    </div>
                                </label>
                                <input id="showDownloadedItemsOnly" type="checkbox" className="w-8 h-5" checked={showDownloadedItemsOnly} onChange={(e) => setShowDownloadedItemsOnly(e.target.checked)} />
                            </div>
                            <div className="flex items-center" data-tooltip-id="ready-for-takeoff" data-tooltip-content="Show only AI's that are likely to run">
                                <label htmlFor="showReadyForTakeoffOnly">
                                    {/* <div className="text-sky-400"> */}
                                    <div>
                                        {/* <IconPlaneTilt size={iconSize} /> */}
                                        Show Ready to Run Only
                                        <Tooltip id="ready-for-takeoff" />
                                    </div>
                                </label>
                                <input id="showReadyForTakeoffOnly" type="checkbox" className="w-8 h-5" checked={showReadyForTakeoffOnly} onChange={(e) => setShowReadyForTakeoffOnly(e.target.checked)} />
                            </div>
                            <div className="flex items-center" data-tooltip-id="model-list-size" data-tooltip-content="Select the number of models to display">
                                <label htmlFor="modelListSize">Show</label>
                                <select className="w-16 ml-2 h-full text-gray-700"
                                    id="modelListSize" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                    </div>
                    <div className='rounded bg-white dark:text-gray-700 text-gray-400'>
                        {!isOnline &&
                            <div className="flex h-80 justify-center items-center">
                                <h3>{`${WINGMAN_OFFLINE_MESSAGE}`}</h3>
                            </div>
                        }
                        {isOnline && isSwitchingModel && (
                            <div className={`flex h-80 space-x-2 justify-center items-center`}>
                                {displayLoadingMessage()}
                            </div>
                        )}
                        {isOnline && !isSwitchingModel && (selectableModels.length === 0) &&
                            <div className="flex h-80 justify-center items-center">
                                {displayLoadingDataMessage()}
                            </div>
                        }
                        {isOnline && !isSwitchingModel && (selectableModels.length > 0) &&
                            <div className="flex flex-col space-y-2">
                                <ul className="flex flex-col h-72 overflow-y-auto">
                                    {selectableModels.map((model: AIModel) => (
                                        <li key={model.id}
                                            ref={model.id === selectedModel?.id ? selectedModelRef : null}
                                            className={`flex items-center justify-between cursor-pointer hover:bg-gray-100 ${model.id === selectedModel?.id ? 'bg-blue-100' : ''}`}
                                            onClick={() => handleSelectModel(model)}
                                        >
                                            <div className='p-4'>
                                                <h3 className='text-base font-medium leading-5'>
                                                    {displayModelName(model)}
                                                </h3>
                                                {displayModelMetrics(model)}
                                            </div>
                                            {displayClearedForTakeoff(model, "ml-auto", true)}
                                            {displayShowDetails(model)}
                                        </li>
                                    ))}
                                </ul>
                                <ReactPaginate
                                    className={'flex h-8 bg-gray-100 justify-center text-sm items-center space-x-2 border transition-all duration-300 ease-in-out'}
                                    pageLinkClassName={'p-1'}
                                    breakLinkClassName={'p-1'}
                                    activeLinkClassName={'p-1 bg-gray-800 text-white text-base'}
                                    pageCount={totalPages}
                                    marginPagesDisplayed={2}
                                    pageRangeDisplayed={5}
                                    onPageChange={(data) => setCurrentPage(data.selected)}
                                />
                            </div>
                        }
                    </div>
                </div>

                <div className='h-72 rounded bg-white dark:text-gray-700 text-gray-400'>
                    <ModelView model={selectedModel} onSelected={(item) => { handleSelectItem(item); }} className="w-full h-full p-2 px-2" />
                </div>
            </div>
        </div>
    );
}
