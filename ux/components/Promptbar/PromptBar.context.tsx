import { PromptbarInitialState } from "./Promptbar.state";
import { ActionType } from "@/hooks/useCreateReducer";
import { Prompt } from "@/types/prompt";
import { Dispatch, createContext } from "react";

export interface PromptbarContextProps {
    state: PromptbarInitialState;
    dispatch: Dispatch<ActionType<PromptbarInitialState>>;
    handleCreatePrompt: () => void;
    handleDeletePrompt: (prompt: Prompt) => void;
    handleUpdatePrompt: (prompt: Prompt) => void;
}

const PromptbarContext = createContext<PromptbarContextProps>(undefined!);

export default PromptbarContext;
