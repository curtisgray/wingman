import React, { useEffect } from "react";
import { AIModel, DownloadableItem, Vendors } from "@/types/ai";
import { IconExternalLink } from "@tabler/icons-react";
import Image from "next/image";
import Select, { ActionMeta, SingleValue } from "react-select";
import DownloadButton from "./DownloadButton";

export type ModelOption = { value: string; label: string | Element; };

export type SelectModelProps = {
    models: AIModel[];
    model?: AIModel;
    defaultModelId?: string;
    onModelChange?: (model: AIModel) => void;
    onQuantizationChange?: (model: AIModel) => void;
    className?: string;
};

export const SelectModel = ({models, model, defaultModelId = "", onModelChange = () => {}, onQuantizationChange = () => {}, className = ""}:SelectModelProps) =>
{
    const [selectedModel, setSelectedModel] = React.useState<AIModel | undefined>(undefined);

    const t = (text: string) =>
    {
        return text;
    };

    const iconSize = 18;

    const handleModelChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) =>
    {
        if (actionMeta.action === "select-option" && typeof onModelChange === "function"){
            const model = models.find((model) => model.id === e?.value) as AIModel;
            setSelectedModel(model);
            onModelChange(model);
            if (model.items && model.items.length > 0)
                quantChange(model, model.items[0].filePath, model.items[0].quantization);
            else
                throw new Error("Model has no quantization options");
        }
    };

    // const handleQuantizationChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
    //     actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) =>
    // {
    //     if (actionMeta.action === "select-option" && typeof onQuantizationChange === "function"){
    //     if (selectedModel?.items) {
    //         if (e.value.selectedOptions.length > 0) {
    //             const option = e.currentTarget.selectedOptions[0];
    //             const item: DownloadableItem = {
    //                 modelRepo: selectedModel.id,
    //                 filePath: option.value,
    //                 quantization: option.label,
    //             };
    //             selectedModel.item = item;
    //             onQuantizationChange(selectedModel);
    //         }
    //     }
    //     }
    // };

    // const handleStartDownload = (
    //     e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    // ) =>
    // {
    //     e.preventDefault();
    // };

    const quantChange=(selectedModel: AIModel, filePath: string, quantization: string) =>
    {
        const item: DownloadableItem = {
            modelRepo: selectedModel.id,
            filePath: filePath,
            quantization: quantization,
        };
        selectedModel.item = item;
        onQuantizationChange(selectedModel);
    };

    const handleQuantChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        if (selectedModel?.items) {
            if (e.currentTarget.selectedOptions.length > 0) {
                const option = e.currentTarget.selectedOptions[0];
                quantChange(selectedModel, option.value, option.label);
            }
        }
    };

    const modelVendor = (model: AIModel | undefined) =>
    {
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

    const modelDisplay = (model: AIModel | undefined) =>
    {
        if (model === undefined) return "";
        // console.debug(`modelDisplay: model: ${model?.name}`);
        if (model.id === selectedModel?.id) {
            // this model is selected
            if (model.id === defaultModelId)
                return <span>Default ({model.name})</span>;
            else return <span>{model.name}</span>;
        } else {
            if (model.id === defaultModelId) {
                return (
                    <span>
                        Default ({model.name})
                    </span>
                );
            } else {
                return <span>{model.name}</span>;
            }
        }
    };

    const groupedModelList = Object.values(Vendors)
        .filter((vendor) => vendor.isEnabled)
        .map((vendor) => ({
            label: vendor.displayName,
            options: models
                .filter((model) => model.vendor === vendor.name)
                .map((model) => ({
                    label: modelDisplay(model),
                    value: model.id,
                } as ModelOption)),
        }));

    // const quantizationOptions = selectedModel?.items?.map(
    //     (quant: DownloadableItem) => (
    //         {
    //             label: quant.quantization,
    //             value: quant.filePath,
    //         }
    //     )
    // );

    useEffect(() =>
    {
        if (model !== undefined) {
            setSelectedModel(model);
            if (model.items && model.items.length > 0)
                quantChange(model, model.items[0].filePath, model.items[0].quantization);
            else
                throw new Error("Model has no quantization options");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[model]);
    return (
        <div className={`${className}`}>
            <div className="flex flex-col w-full">
                <label className="mb-2 text-left">
                    {modelVendor(selectedModel)}
                </label>
                <div className="w-full rounded-lg text-neutral-900 dark:text-white">
                    <Select
                        placeholder={(t("Select a model").length > 0) || ""}
                        options={groupedModelList}
                        value={{
                            label: modelDisplay(selectedModel),
                            value: selectedModel?.id,
                        } as ModelOption}
                        isSearchable={true}
                        hideSelectedOptions={true}
                        onChange={handleModelChange}
                        className="model-select-container"
                        classNamePrefix="model-select"
                    />
                </div>
                {selectedModel?.vendor ===
                    Vendors.huggingface.name &&
                    (
                        <div className="w-full flex flex-col mt-3 text-left">
                            <label>{t("Model quantization")}</label>
                            <select
                                className="w-full rounded border text-neutral-900 dark:text-white p-2 mt-2"
                                placeholder={t("Select a quantization") || undefined}
                                value={
                                    selectedModel?.item?.filePath ?? undefined
                                }
                                onChange={handleQuantChange}
                            >
                                {selectedModel?.items?.map((quant: DownloadableItem) => (
                                    <option
                                        key={quant.quantization}
                                        value={quant.filePath}
                                        className="text-neutral-900 dark:text-white p-2 mt-2"
                                    >
                                        {quant.quantization}
                                    </option>
                                )
                                )}
                            </select>
                            {/* <Select
                                placeholder={(t("Select a model").length > 0) || ""}
                                options={quantizationOptions}
                                value={{
                                    label: selectedModel?.item?.quantization,
                                    value: selectedModel?.item?.filePath,
                                } as ModelOption}
                                isSearchable={true}
                                hideSelectedOptions={true}
                                onChange={handleModelChange}
                                className="model-select-container"
                                classNamePrefix="model-select"
                            /> */}
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
                {selectedModel !== undefined &&
                    selectedModel.item != undefined &&
                    Vendors[selectedModel?.vendor].isDownloadable &&
                    (((selectedModel?.isDownloaded) ?? false) ? (
                        <span className="self-center m-2">Model is downloaded</span>
                    ) : (
                        <div className="self-center m-4">
                            <DownloadButton modelRepo={selectedModel.id}
                                filePath={selectedModel.item.filePath}
                                showFileName={false}
                                showRepoName={false}
                                showProgressText={true}/>
                        </div>
                    ))}
            </div>
        </div>
    );
};
