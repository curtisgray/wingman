/* eslint-disable react-hooks/exhaustive-deps */
import React, { useContext, useEffect } from "react";
import { AIModel, AIModels, DownloadableItem, Vendors } from "@/types/ai";
import { IconCircleCheck, IconExternalLink, IconRefresh } from "@tabler/icons-react";
import Image from "next/image";
import Select, { ActionMeta, SingleValue } from "react-select";
import DownloadButton from "./DownloadButton";
import { DownloadItem, DownloadProps } from "@/types/download";
import { useTranslation } from "next-i18next";
import HomeContext from "@/pages/api/home/home.context";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";

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
    chosenModel?: DownloadProps;
    onChange?: (model: DownloadProps) => boolean; // return false to cancel the change
    onDownloadComplete?: (item: DownloadItem) => void;
    onDownloadStart?: (item: DownloadItem) => void;
    className?: string;
    showDownloadedItemsOnly?: boolean;
    isDisabled?: boolean;
    allowDownload?: boolean;
    autoActivate?: boolean;
    iconSize?: number;
};

const SelectModelInternal = ({ chosenModel,
    onChange = () => true, onDownloadComplete = () => { }, onDownloadStart = () => { },
    className = "", showDownloadedItemsOnly = false, isDisabled: disabled = false,
    allowDownload = true, autoActivate = false, iconSize = 24 }: SelectModelProps) => {

    const [modelList, setModelList] = React.useState<AIModel[]>(Object.values(AIModels));
    const [selectableModels, setSelectableModels] = React.useState<AIModel[]>([]);

    const [selectedModel, setSelectedModel] = React.useState<AIModel | undefined>(undefined);
    const [selectedQuantization, setSelectedQuantization] = React.useState<string | undefined>(undefined);
    const [isLoadingModelList, setIsLoadingModelList] = React.useState<boolean>(false);

    const { t } = useTranslation("chat");

    const inferenceActions = useRequestInferenceAction();

    const {
        state: { selectedConversation, models, defaultModelId },
        handleUpdateConversation,
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const refreshModelList = async () =>
    {
        try {
            setIsLoadingModelList(true);
            // const response = await fetch("http://localhost:6568/api/models");
            // if (!response.ok) {
            //     console.log(`error getting models: ${response.statusText}`);
            // } else {
            //     console.log(`getModels response: ${response?.statusText}`);
            //     const json = await response.json();
            //     setModelList(json.models);
            // }

            setModelList(models);
            setIsLoadingModelList(false);
            // return response;
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
            selectedModel.item = item;
            setSelectedQuantization(quantization);
            const modelRepo = selectedModel.id;
            const filePath = selectedModel.item?.filePath as string;
            if (onChange({modelRepo: modelRepo, filePath: filePath})) {
                if (selectedConversation) {
                    handleUpdateConversation(selectedConversation, {
                        key: "model",
                        value: selectedModel,
                    });
                    // activate the model
                    inferenceActions.requestStartInference(selectedModel.name, modelRepo, filePath, -1);
                    success = true;
                }
            }
        }
        if (!success) {
            setSelectedQuantization(undefined);
        }
    };

    const handleDownloadComplete = (item: DownloadItem) => {
        onDownloadComplete(item);
    };

    const handleDownloadStart = (item: DownloadItem) => {
        onDownloadStart(item);
    };

    const handleModelChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option" && typeof onChange === "function") {
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
                onChange(downloadProps);
            }
        }
    };

    const handleDownloadableItemChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option" && typeof onChange === "function") {
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
        if (!allowDownload || model === undefined || model?.item === undefined || model?.vendor == undefined) return "";
        if (Vendors[model.vendor].isDownloadable) {
            if(model.item.isDownloaded) {
                return <div></div>;
            } else {
                return <div className="self-center m-4" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}}>
                    <DownloadButton modelRepo={model.id}
                        filePath={model.item.filePath}
                        showFileName={false}
                        showRepoName={false}
                        showProgressText={true}
                        onComplete={handleDownloadComplete}
                        onStarted={handleDownloadStart}
                        autoActivate={autoActivate} />
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
        handleRefreshModelList();
        let success = false;
        if (selectedConversation && selectedConversation.model) {
            setSelectedModel(selectedConversation.model);
            if (selectedConversation.model.item) {
                setSelectedQuantization(selectedConversation.model.item.quantization);
                success = onChange({modelRepo: selectedConversation.model.id, filePath: selectedConversation.model.item.filePath});
            }
        }
        if (!success) {
            setSelectedQuantization(undefined);
        }
    }, []);

    useEffect(() => {
        const selectable = showDownloadedItemsOnly ? modelList.filter((model) => model.items?.some((item) => item.isDownloaded)) : modelList;
        setSelectableModels(selectable);
        if (chosenModel !== undefined) {
            const model = selectable.find((m) => m.id === chosenModel.modelRepo);
            if (model !== undefined) {
                if (model.items && model.items.length > 0)
                    model.item = model.items?.find((item) => item.filePath === chosenModel.filePath);
                setSelectedModel(model);
            }
        }
    }, [modelList, chosenModel, showDownloadedItemsOnly]);

    return (
        <div className={`${className}`}>
            <div className="flex flex-col w-full">
                <label className="mb-2 text-left">
                    {displayModelVendor(selectedModel)}
                </label>
                <div className="flex rounded-lg space-x-2 items-center">
                    <Select
                        isLoading={isLoadingModelList}
                        placeholder={(t("Select a model").length > 0) || ""}
                        options={optionsGroupedModels}
                        value={{
                            label: displayModel(selectedModel),
                            value: selectedModel?.id,
                        } as ModelOption}
                        isSearchable={true}
                        hideSelectedOptions={true}
                        onChange={handleModelChange}
                        className="model-select-container w-full text-neutral-900"
                        classNamePrefix="model-select"
                        instanceId={"model-select"}
                        isDisabled={disabled}
                    />
                    <IconRefresh size={28} className="rounded-sm cursor-pointer" onClick={handleRefreshModelList} />
                </div>
                {selectedModel?.vendor === Vendors.huggingface.name &&
                    (
                        <div className="flex mt-3 text-left rounded-lg">
                            <Select
                                isLoading={isLoadingModelList}
                                placeholder={(t("Select an optimization").length > 0) || ""}
                                options={optionsOptimizations}
                                value={{
                                    label: displayQuantization(selectedModel?.item),
                                    value: selectedQuantization,
                                } as QuantizationOption}
                                isSearchable={true}
                                hideSelectedOptions={true}
                                onChange={handleDownloadableItemChange}
                                className="optimization-select-container w-4/12 text-neutral-900"
                                classNamePrefix="optimization-select"
                                instanceId={"optimization-select"}
                                isDisabled={disabled}
                            />
                        </div>
                    )}
                {selectedModel?.vendor === Vendors.openai.name && (
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

export const SelectModel = React.memo(SelectModelInternal);