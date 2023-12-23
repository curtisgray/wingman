/* eslint-disable react-hooks/exhaustive-deps */
import React, { memo, useContext, useEffect, useState } from "react";
import { AIModel, AIModels, DownloadableItem, Vendors } from "@/types/ai";
import { IconCircleCheck, IconExternalLink, IconRefresh } from "@tabler/icons-react";
import Image from "next/image";
import Select, { ActionMeta, SingleValue } from "react-select";
import DownloadButton from "./DownloadButton";
import { DownloadItem, DownloadProps } from "@/types/download";
import { useTranslation } from "next-i18next";
import HomeContext from "@/pages/api/home/home.context";
import WingmanInferenceStatus from "./WingmanInferenceStatus";
import { useImmer } from "use-immer";

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
    allowDownload?: boolean;
    autoDownload?: boolean;
    iconSize?: number;
};

const SelectModelInternal = ({ onValidateChange = () => true, onDownloadComplete = () => { }, onDownloadStart = () => { },
    className = "", isDisabled: disabled = false, miniMode = false,
    allowDownload = true, autoDownload = true, iconSize = 24 }: SelectModelProps) => {

    const [modelList, setModelList] = useState<AIModel[]>(Object.values(AIModels));
    const [selectableModels, setSelectableModels] = useState<AIModel[]>([]);

    const [selectedModel, setSelectedModel] = useImmer<AIModel | undefined>(undefined);
    const [selectedQuantization, setSelectedQuantization] = useImmer<string | undefined>(undefined);
    const [isLoadingModelList, setIsLoadingModelList] = useState<boolean>(false);
    const [isChangingModel, setIsChangingModel] = useState<boolean>(false);
    const [, updateState] = useState({});
    const [showDownloadedItemsOnly, setShowDownloadedItemsOnly] = useState<boolean>(false);

    const { t } = useTranslation("chat");

    const {
        state: { models, globalModel, defaultModelId },
        handleChangeModel,
    } = useContext(HomeContext);

    const refreshModelList = async () =>
    {
        try {
            setIsLoadingModelList(true);
            setModelList(models);
            setIsLoadingModelList(false);
        }
        catch (err) {
            console.log(`exception getting models: ${err}`);
            setIsLoadingModelList(false);
        }
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
                // if the model is already downloaded, then send call handleChangeModel
                //   otherwise, wait for the download to complete, then call handleChangeModel
                if (item.isDownloaded) {
                    handleChangeModel(draftModel);
                } else {
                    setIsChangingModel(true);
                }
            }
        }
        if (!success) {
            setSelectedQuantization(undefined);
        }
    };

    const handleDownloadComplete = (item: DownloadItem) => {
        // if the selectedModel or selectedModel.item is undefined, then something has gone wrong
        if (selectedModel === undefined) throw new Error("selectedModel is undefined");
        if (selectedModel.item === undefined) throw new Error("selectedModel.item is undefined");
        setIsChangingModel(false);
        const draftItem = {...selectedModel.item};
        draftItem.isDownloaded = true;
        const draftModel = {...selectedModel};
        draftModel.item = draftItem;
        setSelectedModel(draftModel);
        handleChangeModel(draftModel);
        onDownloadComplete(item);
    };

    const handleDownloadStart = (item: DownloadItem) => {
        onDownloadStart(item);
    };

    const handleChangeSelectedModel = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option" && typeof onValidateChange === "function") {
            const selectedModel = selectableModels.find((m) => m.id === e?.value) as AIModel;
            setSelectedModel(selectedModel);
            const vendor = Vendors[selectedModel.vendor];
            if (vendor.isDownloadable) {
                // do nothing until the user selects a quantization
            } else {
                // onChange({selectedModel.modelRepo, selectedModel.filePath});
                const downloadProps: DownloadProps = {
                    modelRepo: selectedModel.id,
                    filePath: "",
                };
                onValidateChange(downloadProps);
            }
        }
    };

    const handleDownloadableItemChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option") {
            if (selectedModel?.items) {
                const quantization = e?.value;
                if (quantization !== undefined) {
                    onQuantizationChange(selectedModel, quantization);
                }
            }
        }
    };

    const handleRefreshModelList = async () => {
        await refreshModelList();
    };

    const displayModelVendor = (model: AIModel | undefined) => {
        if (!model) return "";
        // check if the vendor exists in the Vendors enum
        if (!Object.keys(Vendors).includes(model.vendor)) {
            return <span>{model.vendor}</span>;
        } else {
            const vendor = Vendors[model.vendor];
            return (
                <div className="flex space-x-1">
                    <Image
                        src={vendor.logo}
                        width={iconSize}
                        alt={vendor.displayName}
                    />
                    <span>{vendor.displayName}</span>
                </div>
            );
        }
    };

    const displayModel = (model: AIModel | undefined) => {
        if (model === undefined) return "";
        let name = <span>{model.name}</span>;
        if (model.items && model.items.length > 0) {
            const hasDownloadedItem = model.items.some((item) => item.isDownloaded);
            // if (model.name.includes("MetaMath"))
            //     name = <span>MetaMath</span>;
            if (hasDownloadedItem) {
                name = (
                    <div className="flex space-x-1">
                        <IconCircleCheck
                            width={iconSize}
                            className="text-green-700"
                        />
                        <span className="font-bold">{model.name}</span>
                    </div>
                );
            }
        }
        if (model.id === defaultModelId)
            return <span>Default ({name})</span>;
        else return <span>{name}</span>;
    };

    const displayDownload = (model: AIModel | undefined) => {
        if (!allowDownload || model === undefined || model?.item === undefined || model?.vendor == undefined) return <></>;
        if (Vendors[model.vendor].isDownloadable) {
            if (model.item.isDownloaded) {
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
                        autoStart={autoDownload} />
                </div>;
            }
        }
        return "";
    };

    const displayQuantization = (item: DownloadableItem | undefined) => {
        if (item === undefined) return "";

        if (item.isDownloaded) {
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

    const optionsOptimizations = selectedModel?.items?.filter((item: DownloadableItem) => item.isDownloaded || !showDownloadedItemsOnly)
        .map((item: DownloadableItem) => ({
            label: displayQuantization(item),
            value: item.quantization,
        } as QuantizationOption));

    useEffect(() => {
        const selectable = showDownloadedItemsOnly ? modelList.filter((model) => model.items?.some((item) => item.isDownloaded)) : modelList;
        setSelectableModels(selectable);
    }, [modelList, showDownloadedItemsOnly]);

    useEffect(() => {
        handleRefreshModelList();
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

    // keep the selected model in sync with the global model
    useEffect(() => {
        if (globalModel !== undefined && !isChangingModel) {
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
    }, [globalModel]);

    return (
        <div className={`${className}`}>
            <div className="flex flex-col w-full">
                {!miniMode && (
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center">
                            <label htmlFor="showDownloadedItemsOnly">Show downloaded items only</label>
                            <input id="showDownloadedItemsOnly" type="checkbox" className="w-8 h-5" checked={showDownloadedItemsOnly} onChange={(e) => setShowDownloadedItemsOnly(e.target.checked)} />
                        </div>
                        <div className="flex space-x-4">
                            <label className="mb-2 text-left">
                                {displayModelVendor(selectedModel)}
                            </label>
                            <span className="flex-grow"></span>
                            <WingmanInferenceStatus className="px-8" showTitle={false} />
                        </div>
                    </div>
                )}
                <div className="flex rounded-lg space-x-2 items-center">
                    <Select
                        isLoading={isLoadingModelList || isChangingModel}
                        placeholder={(t("Select a model").length > 0) || ""}
                        options={optionsGroupedModels}
                        value={{
                            label: displayModel(selectedModel),
                            value: selectedModel?.id,
                        } as ModelOption}
                        isSearchable={true}
                        // hideSelectedOptions={true}
                        onChange={handleChangeSelectedModel}
                        className="model-select-container w-full text-neutral-900"
                        classNamePrefix="model-select"
                        instanceId={"model-select"}
                        isDisabled={disabled}
                    />
                    {selectedModel?.vendor === Vendors.huggingface.name &&
                    (
                        <Select
                            isLoading={isLoadingModelList || isChangingModel}
                            placeholder={(t("Select an optimization").length > 0) || ""}
                            options={optionsOptimizations}
                            value={{
                                label: displayQuantization(selectedModel?.item),
                                value: selectedQuantization,
                            } as QuantizationOption}
                            isSearchable={true}
                            // hideSelectedOptions={true}
                            onChange={handleDownloadableItemChange}
                            className="optimization-select-container w-4/12 text-neutral-900"
                            classNamePrefix="optimization-select"
                            instanceId={"optimization-select"}
                            isDisabled={disabled}
                        />
                    )}
                    {!miniMode && !isChangingModel && (
                        <IconRefresh size={28} className="rounded-sm cursor-pointer" onClick={handleRefreshModelList} />
                    )}
                </div>
                {!miniMode && selectedModel?.vendor === Vendors.openai.name && (
                    <div className="w-full mt-3 text-left flex items-center">
                        <a
                            href="https://platform.openai.com/account/usage"
                            target="_blank"
                            className="flex items-center"
                            rel="noreferrer"
                        >
                            <IconExternalLink size={18} className={"inline mr-1"} />
                            {t("View OpenAI Account Usage")}
                        </a>
                    </div>
                )}
                {displayDownload(selectedModel)}
            </div>
        </div>
    );
};

export const SelectModel = memo(SelectModelInternal);
