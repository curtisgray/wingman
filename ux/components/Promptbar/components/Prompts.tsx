import { PromptComponent } from "./Prompt";
import { Prompt } from "@/types/prompt";
import { FC } from "react";

interface Props {
    prompts: Prompt[];
}

export const Prompts: FC<Props> = ({ prompts }) => {
    return (
        <div className="flex w-full flex-col gap-1">
            {prompts
                .slice()
                .reverse()
                .map((prompt, index) => (
                    <PromptComponent key={index} prompt={prompt} />
                ))}
        </div>
    );
};
