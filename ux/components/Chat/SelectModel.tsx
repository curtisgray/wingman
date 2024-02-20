/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useContext, useEffect, useState } from "react";
import { AIModel, AIModelID, DownloadableItem, Vendors } from "@/types/ai";
import { IconCircleCheck, IconExclamationCircle, IconExternalLink, IconPlaneTilt, IconRefresh, IconRefreshDot, IconPlaneOff, IconApi, IconCrown } from "@tabler/icons-react";
import Select, { ActionMeta, GroupBase, SingleValue } from "react-select";
import DownloadButton from "./DownloadButton";
import { DownloadItem, DownloadProps } from "@/types/download";
import { useTranslation } from "next-i18next";
import HomeContext from "@/pages/api/home/home.context";
import { useImmer } from "use-immer";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";
import { Tooltip } from "react-tooltip";
import { getSettings, saveSettings } from "@/utils/app/settings";
import { Settings } from "@/types/settings";
import WingmanContext from "@/pages/api/home/wingman.context";
import { displayModelVendor } from "./Util";

export type ModelOption = {
    value: string;
    label: string | Element;
    item?: AIModel;
};

export type QuantizationOption = {
    value: string;
    label: string | Element;
    item?: DownloadableItem;
};

export type SelectModelProps = {
    onValidateChange?: (model: DownloadProps) => boolean; // return false to cancel the change
    onDownloadComplete?: (item: DownloadItem) => void;
    onDownloadStart?: (item: DownloadItem) => void;
    className?: string;
    isDisabled?: boolean;
    miniMode?: boolean;
    easyMode?: boolean;
    allowDownload?: boolean;
    autoDownload?: boolean;
    iconSize?: number;
};

const SelectModelInternal = ({ onValidateChange = () => true, onDownloadComplete = () => { }, onDownloadStart = () => { },
    className = "", isDisabled: disabled = false, miniMode = false,
    allowDownload = true, autoDownload = true, iconSize = 20 }: SelectModelProps) => {
    const settings: Settings = getSettings();

    const [selectableModels, setSelectableModels] = useState<AIModel[]>([]);

    const [model, setSelectedModel] = useImmer<AIModel | undefined>(undefined);
    const [selectedQuantization, setSelectedQuantization] = useImmer<string | undefined>(undefined);
    const [isLoadingModelList, setIsLoadingModelList] = useState<boolean>(false);
    const [isChangingModel, setIsChangingModel] = useState<boolean>(false);
    const [showDownloadedItemsOnly, setShowDownloadedItemsOnly] = useState<boolean>(false);
    const [showReadyForTakeoffOnly, setShowReadyForTakeoffOnly] = useState<boolean>(false);
    const [expertMode, setExpertMode] = useState<boolean>(false);
    const [isForcingDownloadButtonUpdate, setIsForcingDownloadButtonUpdate] = useState<boolean>(false);

    const { t } = useTranslation("chat");

    const { requestResetInference } = useRequestInferenceAction();

    const {
        state: { models, globalModel, defaultModelId },
        handleChangeModel,
    } = useContext(HomeContext);

    const {
        state: { isOnline },
    } = useContext(WingmanContext);

    const handleSaveSettings = () => {
        const newSettings: Settings = {
            ...settings,
            expertMode: expertMode,
            showDownloadedItemsOnly: showDownloadedItemsOnly,
            showReadyForTakeoffOnly: showReadyForTakeoffOnly,
        };
        saveSettings(newSettings);
    };

    const handleDownloadInitialized = (success: boolean) => {
        if (expertMode) setIsChangingModel(false);
    };

    const handleDownloadStart = (item: DownloadItem) => {
        setIsChangingModel(true);
        onDownloadStart(item);
    };

    const handleDownloadComplete = (item: DownloadItem) => {
        // if the selectedModel or selectedModel.item is undefined, then something has gone wrong
        if (model === undefined) throw new Error("selectedModel is undefined");
        if (model.item === undefined) throw new Error("selectedModel.item is undefined");
        setIsChangingModel(false);
        const draftItem = {...model.item};
        draftItem.isDownloaded = true;
        const draftModel = {...model};
        draftModel.item = draftItem;
        setSelectedModel(draftModel);
        handleChangeModel(draftModel);
        onDownloadComplete(item);
    };

    const onQuantizationChange = (selectedModel: AIModel, quantization: string) => {
        const item = selectedModel.items?.find((item) => item.quantization === quantization);
        let success = false;
        if (item) {
            const draftModel = {...selectedModel};
            draftModel.item = item;
            const modelRepo = draftModel.id;
            const filePath = item?.filePath as string;
            if (success = onValidateChange({modelRepo: modelRepo, filePath: filePath})) {
                setSelectedModel(draftModel);
                setSelectedQuantization(quantization);
                if (expertMode) { // if in expertMode, let the user be in control of the download
                    setIsForcingDownloadButtonUpdate(true);
                }
                // if the model is already downloaded, then send call handleChangeModel
                //   otherwise, wait for the download to complete, then call handleChangeModel
                if (item.isDownloaded) {
                    handleChangeModel(draftModel);
                } else {
                    if (expertMode) {   // in expertMode, the user must click the download button to start the download
                    } else {   // if not in expertMode, the download will start automatically, so put the control in 'changing model' state
                        setIsChangingModel(true);
                    }
                }
            }
        }
        if (!success) {
            setSelectedQuantization(undefined);
        }
    };

    const selectModel = (model: AIModel) => {
        setSelectedModel(model)
        const vendor = Vendors[model.vendor]
        if (vendor.isDownloadable) {
            if (expertMode) {
                // if expertMode, then let the user select the quantization
            } else {
                // if not in expertMode, then select the middle quantization and start the download
                // find the middle quantization
                const middleIndex = Math.floor(
                    (model.items?.length as number) / 2
                )
                const middleQuantization = model.items?.[middleIndex]
                    .quantization as string
                onQuantizationChange(model, middleQuantization)
            }
        } else {
            const downloadProps: DownloadProps = {
                modelRepo: model.id,
                filePath: '',
            }
            if (onValidateChange(downloadProps)) {
                handleChangeModel(model)
            }
            setIsChangingModel(false)
        }
    }

    const handleChangeSelectedModel = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option" && typeof onValidateChange === "function") {
            const selectedModel = selectableModels.find((m) => m.id === e?.value) as AIModel;
            selectModel(selectedModel);
        }
    };

    const handleDownloadableItemChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option") {
            if (model?.items) {
                const quantization = e?.value;
                if (quantization !== undefined) {
                    onQuantizationChange(model, quantization);
                }
            }
        }
    };

    const handleRefreshModels = async () => {
        try {
            setIsLoadingModelList(true);
            const downloadsFilter = showDownloadedItemsOnly ? models.filter((model) =>
                (Vendors[model.vendor].isDownloadable && model.items?.some((item) => item.isDownloaded)) ||
                (!Vendors[model.vendor].isDownloadable))
                : models;

            const selectable = showReadyForTakeoffOnly ? downloadsFilter.filter((model) =>
                (Vendors[model.vendor].isDownloadable && model.isInferable) ||
                (!Vendors[model.vendor].isDownloadable))
                : models;

            setSelectableModels(selectable);
            setIsLoadingModelList(false);
        }
        catch (err) {
            console.log(`handleRefreshModelList exception: ${err}`);
            setIsLoadingModelList(false);
        }
    };

    const handleResetSelectedModel = () => {
        if (model?.item !== undefined) {
            requestResetInference(model.item.filePath).then(() => {
                const draftModel = {...model};
                const draftItem = {...model.item as DownloadableItem};
                draftItem.hasError = false;
                draftModel.item = draftItem;
                setSelectedModel(draftModel);
                handleChangeModel(draftModel);
            });
        }
    };

    const displayClearedForTakeoff = (model: AIModel) =>
    {
        if (Vendors[model.vendor].isDownloadable) {
            if (model.isInferable) {
                return <div className="text-sky-400">
                    <IconPlaneTilt size={iconSize} />
                </div>;
            } else {
                return <div className="text-gray-500">
                    <IconPlaneOff size={iconSize} />
                </div>;
            }
        }
        return <div className="text-green-800">
            <IconApi size={iconSize} data-tooltip-id="is-api-inferred" data-tooltip-content="Always cleared for takeoff" />
            <Tooltip id="is-api-inferred" />
        </div>;
    };

    const displayModelName = (model: AIModel | undefined) => {
        if (!model) return <></>;
        const vendor = Vendors[model.vendor];
        if (vendor.isDownloadable) {
            // split the repo owner and name and return 'name (repo owner)'
            const [owner, repo] = model.name.split('/')
            return (
                <div className='flex space-x-1'>
                    {displayClearedForTakeoff(model)}
                    <span>{repo}</span>
                    <span className="text-xs">{owner}</span>
                </div>
            )
        } else {
            return <span>{model.name}</span>
        }
    }

    const displayModel = (model: AIModel | undefined) => {
        if (model === undefined) return "";
        let name = displayModelName(model);
        if (model.items && model.items.length > 0) {
            const hasDownloadedItem = model.items.some((item) => item.isDownloaded);
            const hasErrorItem = model.items.some((item) => item.hasError);
            if (hasErrorItem) {
                name = (
                    <div className="flex space-x-1">
                        <IconExclamationCircle
                            width={iconSize}
                            className="text-red-700"
                        />
                        <span className="font-bold">{displayModelName(model)}</span>
                    </div>
                );
            } else if (hasDownloadedItem) {
                name = (
                    <div className="flex space-x-1">
                        <IconCircleCheck
                            width={iconSize}
                            className="text-green-700"
                        />
                        <span className="font-bold">{displayModelName(model)}</span>
                    </div>
                );
            }
        }
        if (model.id === AIModelID.NO_MODEL_SELECTED)
            return <span>{`Search ...`}</span>;
        if (model.id === defaultModelId)
            return <span>{name}</span>;
        // return <span>Default ({name})</span>;
        else return <span>{name}</span>;
    };

    const displayDownload = (model: AIModel | undefined) => {
        if (!allowDownload || model === undefined || model?.item === undefined || model?.vendor == undefined) return <></>;
        if (Vendors[model.vendor].isDownloadable) {
            if (isForcingDownloadButtonUpdate) {
                return <div className="self-center m-4" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}}>
                    <span className="animate-pulse inline-flex h-2 w-2 mx-1 rounded-full bg-lime-400">wait</span>
                </div>;
            } else if (!expertMode && model.item.isDownloaded) {
                return <></>;
            } else {
                return <div className="self-center m-4" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}}>
                    <DownloadButton modelRepo={model.id}
                        filePath={model.item.filePath}
                        showFileName={false}
                        showRepoName={false}
                        showProgressText={true}
                        onComplete={handleDownloadComplete}
                        onStarted={handleDownloadStart}
                        onInitialized={handleDownloadInitialized}
                        autoStart={autoDownload && !expertMode} />
                </div>;
            }
        }
        return <></>;
    };

    const displayQuantization = (item: DownloadableItem | undefined) => {
        if (item === undefined) return "";

        if (item.hasError) {
            return (
                <div className="flex space-x-1">
                    <IconExclamationCircle
                        width={iconSize}
                        className="text-red-700"
                    />
                    <span className="font-bold">{item.quantizationName}</span>
                </div>
            );
        } else if (item.isDownloaded) {
            return (
                <div className="flex space-x-1">
                    <IconCircleCheck
                        width={iconSize}
                        className="text-green-700"
                    />
                    <span className="font-bold">{item.quantizationName}</span>
                </div>
            );
        }
        return <span>{item.quantizationName}</span>;
    };

    const optionsGroupedModels = Object.values(Vendors)
        .filter((vendor) => vendor.isEnabled)
        .map((vendor) => ({
            label: vendor.displayName,
            options: selectableModels
                .filter((m) => m.vendor === vendor.name)
                .map((mm) => ({
                    label: displayModel(mm),
                    value: mm.id,
                } as ModelOption)),
        }));

    const getGroupedModelList = (): readonly (ModelOption | GroupBase<ModelOption>)[] => {
        const getOptions = (vendor: string) => {
            const options = selectableModels
                .filter((m) => m.vendor === vendor)
                .map((mm) => ({
                    label: displayModel(mm),
                    value: mm.id,
                } as ModelOption));
            return options;
        }
        const groupedModels = Object.values(Vendors)
            .filter((vendor) => vendor.isEnabled)
            .map((vendor) => ({
                label: vendor.displayName,
                options: getOptions(vendor.name),
            }));
        return groupedModels;
    };

    const optionsOptimizations = model?.items?.filter((item: DownloadableItem) => item.isDownloaded || !showDownloadedItemsOnly)
        .map((item: DownloadableItem) => ({
            label: displayQuantization(item),
            value: item.quantization,
        } as QuantizationOption));

    useEffect(() => {
        if (globalModel !== undefined) {
            if (globalModel.item === undefined) {
                // whenever the globalModel changes, the globalModel.item must be, otherwise
                //   something has gone wrong in setting the global model
                //   so reset the controls
                setSelectedModel(undefined);
                setSelectedQuantization(undefined);
                return;
            }
            // at startup, set the controls to match the global model
            setSelectedModel(globalModel);
            setSelectedQuantization(globalModel.item.quantization);
        }
    }, []);

    useEffect(() => {
        if (isForcingDownloadButtonUpdate) {
            setIsForcingDownloadButtonUpdate(false);
        }
    }, [isForcingDownloadButtonUpdate]);

    const syncComponentWithGlobalModel = () => {
        // if model vendor is openai, then notify the user that the model is ready and return
        if (globalModel?.vendor === "openai") {
            setSelectedModel(globalModel);
            setSelectedQuantization(undefined);
            return;
        }
        if (globalModel === undefined && !isChangingModel) {
            setSelectedModel(undefined);
            setSelectedQuantization(undefined);
        } else if (globalModel !== undefined && !isChangingModel) {
            if (globalModel.item === undefined) {
                // whenever the globalModel changes, the globalModel.item must be, otherwise
                //   something has gone wrong in setting the global model
                //   so reset the controls
                setSelectedModel(undefined);
                setSelectedQuantization(undefined);
                return;
            }
            setSelectedModel(globalModel);
            if (selectedQuantization !== globalModel.item.quantization) {
                // globalModel has changed, so update the controls to match
                setSelectedQuantization(globalModel.item.quantization);
            }
        }
    };

    // keep the selected model in sync with the global model
    useEffect(() => {
        syncComponentWithGlobalModel();
    }, [globalModel]);

    useEffect(() => {
        handleRefreshModels();
        // setIsInferables();
    }, [models, showDownloadedItemsOnly, showReadyForTakeoffOnly]);

    useEffect(() => {
        syncComponentWithGlobalModel();
        const newSettings: Settings = {
            ...settings,
            expertMode: expertMode,
        };
        saveSettings(newSettings);
    }, [expertMode]);

    useEffect(() => {
        const newSettings: Settings = {
            ...settings,
            showDownloadedItemsOnly: showDownloadedItemsOnly,
            showReadyForTakeoffOnly: showReadyForTakeoffOnly,
        };
        saveSettings(newSettings);
    }, [showDownloadedItemsOnly, showReadyForTakeoffOnly]);

    return (
        <div className={`${className}`}>
            <div className="flex flex-col w-full">
                {!miniMode && (
                    <div className="flex flex-col space-y-4">
                        <div className="flex pb-2">
                            <label className="text-left text-gray-700 dark:text-gray-400">
                                {t("To engage any available AI model, use the search box below.")}
                            </label>
                            <span className="flex-grow"></span>
                        </div>
                        <div className="flex space-x-2">
                            <div className="flex items-center" data-tooltip-id="show-downloaded-only" data-tooltip-content="Show only AI models that have already been downloaded">
                                <label htmlFor="showDownloadedItemsOnly">
                                    <div className="text-green-700">
                                        <IconCircleCheck size={iconSize} />
                                        <Tooltip id="show-downloaded-only" />
                                    </div>
                                </label>
                                <input id="showDownloadedItemsOnly" type="checkbox" className="w-8 h-5" checked={showDownloadedItemsOnly} onChange={(e) => setShowDownloadedItemsOnly(e.target.checked)} />
                            </div>
                            <div className="flex items-center" data-tooltip-id="ready-for-takeoff" data-tooltip-content="Show only AI models that are likely to run">
                                <label htmlFor="showReadyForTakeoffOnly">
                                    <div className="text-sky-400">
                                        <IconPlaneTilt size={iconSize} />
                                        <Tooltip id="ready-for-takeoff" />
                                    </div>
                                </label>
                                <input id="showReadyForTakeoffOnly" type="checkbox" className="w-8 h-5" checked={showReadyForTakeoffOnly} onChange={(e) => setShowReadyForTakeoffOnly(e.target.checked)} />
                            </div>
                            <div className="flex items-center" data-tooltip-id="expert-mode" data-tooltip-content="Enable expert search options">
                                <label htmlFor="expert-mode">
                                    <div className="text-indigo-600">
                                        <IconCrown size={iconSize} />
                                        <Tooltip id="expert-mode" />
                                    </div>
                                </label>
                                <input id="expertMode" type="checkbox" className="w-8 h-5" checked={expertMode} onChange={(e) => setExpertMode(e.target.checked)} />
                            </div>
                        </div>
                        <div className="flex pb-2">
                            <label className="text-left">
                                {displayModelVendor(model, true, false)}
                            </label>
                        </div>
                    </div>
                )}
                <div className="flex rounded-lg space-x-2 items-center">
                    <>
                        <Select
                            isLoading={isLoadingModelList || isChangingModel}
                            // placeholder={(t("Search for an AI model").length > 0) || ""}
                            placeholder="Search ..."
                            options={getGroupedModelList()}
                            value={{
                                label: displayModel(model),
                                value: model?.id,
                            } as ModelOption}
                            isSearchable={true}
                            // hideSelectedOptions={true}
                            onChange={handleChangeSelectedModel}
                            className="model-select-container w-full text-gray-900 bg-slate-700"
                            classNamePrefix="model-select"
                            instanceId={"model-select"}
                            isDisabled={disabled || !isOnline}
                            data-tooltip-id="model-select"
                            data-tooltip-content="Select or search for an AI model"
                        />
                        <Tooltip id="model-select" />
                    </>
                    {expertMode && model?.vendor !== undefined && Vendors[model.vendor].isDownloadable &&
                    (
                        <>
                            <Select
                                isLoading={isLoadingModelList || isChangingModel}
                                placeholder={(t("Select an optimization").length > 0) || ""}
                                options={optionsOptimizations}
                                value={{
                                    label: displayQuantization(model?.item),
                                    value: selectedQuantization,
                                } as QuantizationOption}
                                isSearchable={true}
                                // hideSelectedOptions={true}
                                onChange={handleDownloadableItemChange}
                                className="optimization-select-container w-4/12 text-gray-900"
                                classNamePrefix="optimization-select"
                                instanceId={"optimization-select"}
                                isDisabled={disabled || !isOnline}
                                data-tooltip-id="optimization-select"
                                data-tooltip-content="Select or search for an optimization"
                            />
                            <Tooltip id="optimization-select" />
                        </>
                    )}
                    <>
                        {!miniMode && !isChangingModel && (
                            <>
                                <IconRefresh size={28} className="rounded-sm cursor-pointer" onClick={handleRefreshModels}
                                    data-tooltip-id="refresh-models-list" data-tooltip-content="Refresh list of AI models" />
                                <Tooltip id="refresh-models-list" />
                            </>
                        )}
                        {!miniMode && model?.item?.hasError && (
                            <>
                                <IconRefreshDot size={28} className="rounded-sm cursor-pointer" onClick={handleResetSelectedModel}
                                    data-tooltip-id="reset-selected-model" data-tooltip-content="Clear error to try running the AI model again" />
                                <Tooltip id="reset-selected-model" />
                            </>
                        )}
                    </>
                </div>
                {!miniMode && model?.vendor === Vendors.openai.name && (
                    <div className="w-full mt-3 text-left flex items-center">
                        <a
                            href="https://platform.openai.com/account/usage"
                            target="_blank"
                            className="flex items-center"
                            rel="noreferrer"
                        >
                            <IconExternalLink size={iconSize} className={"inline mr-1"} />
                            {t("View OpenAI Account Usage")}
                        </a>
                    </div>
                )}
                {displayDownload(model)}
            </div>
        </div>
    );
};

export const SelectModel = memo(SelectModelInternal);
