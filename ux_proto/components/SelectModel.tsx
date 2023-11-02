import React, { useEffect } from "react";
import { AIModel, AIModels, DownloadableItem, Vendors } from "@/types/ai";
import { IconCircleCheck, IconExternalLink, IconRefresh } from "@tabler/icons-react";
import Image from "next/image";
import Select, { ActionMeta, SingleValue } from "react-select";
import DownloadButton from "./DownloadButton";
import { DownloadItem, DownloadProps } from "@/types/download";

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
    defaultModelId?: string;
    onChange?: (model: DownloadProps) => void;
    onDownloadComplete?: (item: DownloadItem) => void;
    onDownloadStart?: (item: DownloadItem) => void;
    className?: string;
    showDownloadedItemsOnly?: boolean;
    isDisabled?: boolean;
    allowDownload?: boolean;
    autoActivate?: boolean;
};

const SelectModelInternal = ({ chosenModel,
    defaultModelId = "", onChange = () => { }, onDownloadComplete = () => { }, onDownloadStart = () => { },
    className = "", showDownloadedItemsOnly = false, isDisabled: disabled = false, allowDownload = true, autoActivate = false }: SelectModelProps) => {

    const [models, setModels] = React.useState<AIModel[]>(Object.values(AIModels));
    const [model, setModel] = React.useState<AIModel | undefined>(undefined);

    const [selectedModel, setSelectedModel] = React.useState<AIModel | undefined>(undefined);
    const [selectedQuantization, setSelectedQuantization] = React.useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const t = (text: string) => {
        return text;
    };

    const iconSize = 24;

    if (chosenModel !== undefined && model === undefined) {
        const model = models.find((m) => m.id === chosenModel.modelRepo);
        if (model !== undefined) {
            setModel(model);
        }
    }

    const selectableModels = showDownloadedItemsOnly ? models.filter((model) => model.items?.some((item) => item.isDownloaded)) : models;

    const handleModelChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option" && typeof onChange === "function") {
            const selectedModel = selectableModels.find((m) => m.id === e?.value) as AIModel;
            setSelectedModel(selectedModel);
            const vendor = Vendors[selectedModel.vendor];
            if (vendor.isDownloadable) {
                if (selectedModel.items && selectedModel.items.length > 0) {
                    // look for the first item that is downloaded
                    const downloadedItem = selectedModel.items.find((item) => item.isDownloaded);
                    const quantization = downloadedItem !== undefined ?
                        downloadedItem.quantization : selectedModel.items[0].quantization;
                    onDownloadableItemChange(selectedModel, quantization);
                }
                else
                    throw new Error("Model has no optimization (quantization) options");
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

    const onDownloadableItemChange = (selectedModel: AIModel, quantization: string) => {
        selectedModel.item = selectedModel.items?.find((item) => item.quantization === quantization);
        setSelectedQuantization(quantization);
        const filePath = selectedModel.item?.filePath as string;
        onChange({modelRepo: selectedModel.id, filePath: filePath});
    };

    const handleDownloadableItemChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) => {
        if (actionMeta.action === "select-option" && typeof onChange === "function") {
            if (selectedModel?.items) {
                const quantization = e?.value;
                if (quantization !== undefined) {
                    onDownloadableItemChange(selectedModel, quantization);
                }
            }
        }
    };

    const getModels = async () =>
    {
        try {
            setIsLoading(true);
            const response = await fetch("http://localhost:6568/api/models");
            if (!response.ok) {
                console.log(`error getting models: ${response.statusText}`);
            } else {
                console.log(`getModels response: ${response?.statusText}`);
                const json = await response.json();
                // const aiModels = Object.values(AIModels);
                // setModels(aiModels.concat(json.models));
                setModels(json.models);
            }
            setIsLoading(false);
            return response;
        }
        catch (err) {
            console.log(`exception getting models: ${err}`);
            setIsLoading(false);
        }
    };

    const handleRefreshModels = async () => {
        await getModels();
    };

    useEffect(() => {
        getModels();
    }, []);

    const modelVendor = (model: AIModel | undefined) => {
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

    const modelDisplay = (model: AIModel | undefined) => {
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

    const handleDownloadComplete = (item: DownloadItem) => {
        onDownloadComplete(item);
    };

    const handleDownloadStart = (item: DownloadItem) => {
        onDownloadStart(item);
    };

    const downloadDisplay = (model: AIModel | undefined) => {
        if (!allowDownload || model === undefined || model?.item === undefined || model?.vendor == undefined) return "";
        if (Vendors[model.vendor].isDownloadable) {
            if(model.item.isDownloaded) {
                // return <span className="self-center m-2">Model is downloaded</span>;
                // return <button type="button" disabled={true}
                //     className="w-fit self-center bg-blue-500 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold py-2 px-4 m-4 rounded">
                //     Downloaded
                // </button>;
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

    const quantizationDisplay = (item: DownloadableItem | undefined) => {
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

    const groupedModelList = Object.values(Vendors)
        .filter((vendor) => vendor.isEnabled)
        .map((vendor) => ({
            label: vendor.displayName,
            options: selectableModels
                .filter((model) => model.vendor === vendor.name)
                .map((model) => ({
                    label: modelDisplay(model),
                    value: model.id,
                } as ModelOption)),
        }));

    const optimizationOptions = selectedModel?.items?.map((item: DownloadableItem) => ({
        label: quantizationDisplay(item),
        value: item.quantization,
    } as QuantizationOption));

    useEffect(() => {
        if (model !== undefined) {
            setSelectedModel(model);
            if (model.item !== undefined)
                onDownloadableItemChange(model, model.item.quantization);
            else if (model.items && model.items.length > 0)
                onDownloadableItemChange(model, model.items[0].quantization);
            else
                throw new Error("Model has no optimization (quantization) options");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model]);

    return (
        <div className={`${className}`}>
            <div className="flex flex-col w-full">
                <label className="mb-2 text-left">
                    {modelVendor(selectedModel)}
                </label>
                <div className="flex w-full rounded-lg space-x-2 items-center text-neutral-900 dark:text-white">
                    <Select
                        isLoading={isLoading}
                        placeholder={(t("Select a model").length > 0) || ""}
                        options={groupedModelList}
                        value={{
                            label: modelDisplay(selectedModel),
                            value: selectedModel?.id,
                        } as ModelOption}
                        isSearchable={true}
                        hideSelectedOptions={true}
                        onChange={handleModelChange}
                        className="model-select-container w-full"
                        classNamePrefix="model-select"
                        instanceId={"model-select"}
                        isDisabled={disabled}
                    />
                    <IconRefresh size={28} className="rounded-sm bg-white dark:bg-neutral-900 cursor-pointer" onClick={handleRefreshModels} />
                </div>
                {selectedModel?.vendor === Vendors.huggingface.name &&
                    (
                        <div className="w-full flex flex-col mt-3 text-left rounded-lg text-neutral-900 dark:text-white">
                            <label>{t("Model Optimization")}</label>
                            <Select
                                isLoading={isLoading}
                                placeholder={(t("Select a model").length > 0) || ""}
                                options={optimizationOptions}
                                value={{
                                    label: quantizationDisplay(selectedModel?.item),
                                    value: selectedQuantization,
                                } as QuantizationOption}
                                isSearchable={true}
                                hideSelectedOptions={true}
                                onChange={handleDownloadableItemChange}
                                className="optimization-select-container"
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
                {downloadDisplay(selectedModel)}
            </div>
        </div>
    );
};

export const SelectModel = React.memo(SelectModelInternal);