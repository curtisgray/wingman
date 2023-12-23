import React from "react";
import { AIModel } from "@/types/ai";
import { SelectModel } from "./SelectModel";
import { t } from "i18next";
import { SystemPrompt } from "./SystemPrompt";
import { TemperatureSlider } from "./Temperature";
import { Conversation } from "@/types/chat";
import { Prompt } from "@/types/prompt";

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
            <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                {models.length > 0 && (
                    <div className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
                        <div className="w-full text-gray-800 dark:text-gray-100 ">
                            <SelectModel autoDownload={true} />
                        </div>

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
                )}
            </div>
        </>
    )
}

export default ChatSettings;