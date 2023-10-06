import React from "react";
import HomeContext from "@/pages/api/home/home.context";
import { AIModel, DownloadableItem, Vendors } from "@/types/ai";
import { IconExternalLink } from "@tabler/icons-react";
// import { useTranslation } from "next-i18next";
import Image from "next/image";
import { useContext } from "react";
import Select, { ActionMeta, SingleValue } from "react-select";
import DownloadButton from "./DownloadButton";

type ModelOption = { value: string; label: string | Element; };

export const ModelSelect = () =>
{
    // const { t } = useTranslation("chat");
    const t = (text: string) =>
    {
        return text;
    };

    const iconSize = 18;

    const {
        state: { selectedConversation, models, defaultModelId },
        handleUpdateConversation,
    } = useContext(HomeContext);

    const handleReactSelectChange = (e: SingleValue<{ value: string | undefined; label: string | Element; }>,
        actionMeta: ActionMeta<{ value: string | undefined; label: string | Element; }>) =>
    {
        console.debug(`handleReactSelectChange: selectedConversation: ${selectedConversation}`);
        if (selectedConversation) {
            actionMeta.action === "select-option" && handleUpdateConversation(selectedConversation, {
                key: "model",
                value: models.find((model) => model.id === e?.value) as AIModel,
            });
        }
    };

    // const handleStartDownload = (
    //     e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    // ) =>
    // {
    //     e.preventDefault();
    // };

    const handleQuantChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    {
        console.debug(`handleQuantChange: selectedConversation?.model?.items: ${selectedConversation?.model?.items}`);
        if (selectedConversation?.model?.items) {
            if (e.currentTarget.selectedOptions.length > 0) {
                const option = e.currentTarget.selectedOptions[0];
                const item: DownloadableItem = {
                    modelRepo: selectedConversation.model.id,
                    filePath: option.value,
                    quantization: option.label,
                };
                selectedConversation.model.item = item;
            }
            // console.log(e.currentTarget.value);
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
        if (model.id === selectedConversation?.model?.id) {
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

    // { label: string; options: ModelOption[]; }[]
    const groupedModelList = Object.values(Vendors)
        .filter((vendor) => vendor.isEnabled)
        .map((vendor) => ({
            label: vendor.displayName,
            options: models
                .filter((model) => model.vendor === vendor.name)
                .map((model) => ({
                    value: model.id,
                    label: modelDisplay(model),
                } as ModelOption)),
        }));

    return (
        <div className="flex flex-col w-full">
            <label className="mb-2 text-left">
                {modelVendor(selectedConversation?.model)}
            </label>
            <div className="w-full rounded-lg border border-neutral-200 bg-transparent text-neutral-900 dark:border-neutral-600 dark:text-white">
                <Select
                    placeholder={(t("Select a model").length > 0) || ""}
                    options={groupedModelList}
                    value={{
                        value: selectedConversation?.model?.id,
                        label: modelDisplay(selectedConversation?.model),
                    } as ModelOption}
                    isSearchable={true}
                    hideSelectedOptions={true}
                    onChange={handleReactSelectChange}
                    className="my-react-select-container"
                    classNamePrefix="my-react-select"
                />
            </div>
            {selectedConversation?.model?.vendor ===
                Vendors.huggingface.name &&
                (
                    <div className="w-full flex flex-col mt-3 text-left">
                        <label>{t("Model quantization")}</label>
                        <select
                            className="w-full bg-transparent p-2 mt-2"
                            placeholder={t("Select a model") || undefined}
                            value={
                                selectedConversation?.model?.id ?? defaultModelId
                            }
                            onChange={handleQuantChange}
                        >
                            {selectedConversation?.model?.items?.map(
                                (quant: DownloadableItem) => (
                                    <option
                                        key={quant.quantization}
                                        value={quant.filePath}
                                        className="dark:bg-[#343541] dark:text-white"
                                    >
                                        {quant.quantization}
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                )}
            {selectedConversation?.model?.vendor === Vendors.openai.name && (
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
            {selectedConversation?.model !== undefined &&
                selectedConversation.model.item != undefined &&
                Vendors[selectedConversation?.model?.vendor].isDownloadable &&
                (((selectedConversation?.model?.isDownloaded) ?? false) ? (
                    <span className="self-center m-2">Model is downloaded</span>
                ) : (
                    <DownloadButton modelRepo={selectedConversation.model.id}
                        filePath={selectedConversation.model.item.filePath} />
                ))}
        </div>
    );
};
