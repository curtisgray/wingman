import React from "react";
import { AIModel } from "@/types/ai";
import { SelectModel } from "./SelectModel";
import { t } from "i18next";
import { SystemPrompt } from "./SystemPrompt";
import { TemperatureSlider } from "./Temperature";
import { Conversation } from "@/types/chat";
import { Prompt } from "@/types/prompt";
import ModelListing from "./ModelListing";
import WingmanInferenceStatus from "./WingmanInferenceStatus";

interface Props {
    models: AIModel[];
    conversation: Conversation;
    prompts: Prompt[];
    onChangeSystemPrompt: (prompt: string) => void;
    onChangeTemperature: (temperature: number) => void;
}

const ChatSettings = ({ models, conversation, prompts, onChangeSystemPrompt, onChangeTemperature }: Props) => {
    return (
        <>
            <div className="mx-auto flex flex-col space-y-5 md:space-y-10 pt-5 sm:max-w-3xl">
                {models.length > 0 && (
                    <div className="flex h-full w-full flex-col space-y-4 rounded-lg border border-gray-200  dark:border-gray-600 text-gray-800 dark:text-gray-100 ">
                        <div className="flex w-full justify-center dark:bg-gray-600 rounded-t-lg p-1">
                            <WingmanInferenceStatus showTitle={false} showQuantization={false} />
                        </div>
                        <div className="flex flex-col space-y-4 p-4">
                        <ModelListing />
                        <SelectModel autoDownload={true} />

                        <SystemPrompt
                            conversation={conversation}
                            prompts={prompts}
                            onChangePrompt={onChangeSystemPrompt}
                        />

                        <TemperatureSlider
                            label={t("Temperature")}
                            onChangeTemperature={onChangeTemperature}
                        />
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default ChatSettings;