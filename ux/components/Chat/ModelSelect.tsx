import HomeContext from "@/pages/api/home/home.context";
import { AIModel, Vendors } from "@/types/ai";
import { IconExternalLink, IconBrandOpenai } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import Image from "next/image";
import { useContext } from "react";
import Select from "react-select";

export const ModelSelect = () => {
    const { t } = useTranslation("chat");

    const iconSize = 18;

    const {
        state: { selectedConversation, models, defaultModelId },
        handleUpdateConversation,
        dispatch: homeDispatch,
    } = useContext(HomeContext);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (selectedConversation) {
            handleUpdateConversation(selectedConversation, {
                key: "model",
                value: models.find(
                    (model) => model.id === e.target.value
                ) as AIModel,
            });
        }
    };

    const handleReactSelectChange = (e: any) => {
        if (selectedConversation) {
            handleUpdateConversation(selectedConversation, {
                key: "model",
                value: models.find((model) => model.id === e.value) as AIModel,
            });
        }
    };

    const handleStartDownload = (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        e.preventDefault();
    };

    const handleQuantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (selectedConversation?.model?.quantizations) {
            const quant = selectedConversation?.model?.quantizations.find(
                (quant) => quant === e.target.value
            );
        }
    };

    const modelVendor = (model: AIModel | undefined) => {
        if (!model) return "";
        // check if the vendor exists in the Vendors enum
        const vendor = Vendors[model.vendor];
        if (!vendor) {
            return <span>{model.vendor}</span>;
        } else {
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
        if (!model) return "";
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

    const groupedModelList = Object.values(Vendors)
        .filter((vendor) => vendor.isEnabled)
        .map((vendor) => ({
            label: vendor.displayName,
            options: models
                .filter((model) => model.vendor === vendor.name)
                .map((model) => ({
                    value: model.id,
                    label: modelDisplay(model),
                })),
        }));

    return (
        <div className="flex flex-col">
            <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
                {modelVendor(selectedConversation?.model)}
            </label>
            <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
                <Select
                    placeholder={t("Select a model") || ""}
                    options={groupedModelList}
                    value={{
                        value: selectedConversation?.model?.id,
                        label: modelDisplay(selectedConversation?.model),
                    }}
                    isSearchable={true}
                    hideSelectedOptions={true}
                    onChange={handleReactSelectChange}
                    className="my-react-select-container"
                    classNamePrefix="my-react-select"
                />
            </div>
            {selectedConversation?.model?.vendor ===
                Vendors.huggingface.name && (
                <div className="w-full flex flex-col mt-3 text-left text-neutral-700 dark:text-neutral-400">
                    <label>{t("Model quantization")}</label>
                    <select
                        className="w-full bg-transparent p-2 mt-2"
                        placeholder={t("Select a model") || ""}
                        value={
                            selectedConversation?.model?.id || defaultModelId
                        }
                        onChange={handleQuantChange}
                    >
                        {selectedConversation?.model?.quantizations?.map(
                            (quant) => (
                                <option
                                    key={quant}
                                    value={quant}
                                    className="dark:bg-[#343541] dark:text-white"
                                >
                                    {quant}
                                </option>
                            )
                        )}
                    </select>
                </div>
            )}
            {selectedConversation?.model?.vendor === Vendors.openai.name && (
                <div className="w-full mt-3 text-left text-neutral-700 dark:text-neutral-400 flex items-center">
                    <a
                        href="https://platform.openai.com/account/usage"
                        target="_blank"
                        className="flex items-center"
                    >
                        <IconExternalLink size={18} className={"inline mr-1"} />
                        {t("View OpenAI Account Usage")}
                    </a>
                </div>
            )}
            {selectedConversation?.model?.vendor !== undefined &&
                Vendors[selectedConversation?.model?.vendor].isDownloadable &&
                (selectedConversation?.model?.isDownloaded ? (
                    <span className="self-center m-2">Model is downloaded</span>
                ) : (
                    <button
                        className="w-min self-center bg-transparent hover:bg-blue-500 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
                        onClick={handleStartDownload}
                    >
                        {t("Download model")}
                    </button>
                ))}
        </div>
    );
};
