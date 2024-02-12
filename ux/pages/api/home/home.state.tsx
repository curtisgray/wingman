import { Conversation, Message } from "@/types/chat";
import { ErrorMessage } from "@/types/error";
import { FolderInterface } from "@/types/folder";
import { AIModel, AIModelID } from "@/types/ai";
import { PluginKey } from "@/types/plugin";
import { Prompt } from "@/types/prompt";

export interface HomeStateProps {
    apiKey: string;
    pluginKeys: PluginKey[];
    loading: boolean;
    lightMode: "light" | "dark";
    messageIsStreaming: boolean;
    modelError: ErrorMessage | null;
    models: AIModel[];
    defaultModel: AIModel | undefined;
    globalModel: AIModel | undefined;
    isSwitchingModel: boolean;
    folders: FolderInterface[];
    conversations: Conversation[];
    selectedConversation: Conversation | undefined;
    currentMessage: Message | undefined;
    prompts: Prompt[];
    temperature: number;
    showChatbar: boolean;
    showPromptbar: boolean;
    currentFolder: FolderInterface | undefined;
    messageError: boolean;
    searchTerm: string;
    defaultModelId: AIModelID | undefined;
    serverSideApiKeyIsSet: boolean;
    serverSidePluginKeysSet: boolean;
}

export const initialState: HomeStateProps = {
    apiKey: "",
    loading: false,
    pluginKeys: [],
    lightMode: "dark",
    messageIsStreaming: false,
    modelError: null,
    models: [],
    defaultModel: undefined,
    globalModel: undefined,
    isSwitchingModel: false,
    folders: [],
    conversations: [],
    selectedConversation: undefined,
    currentMessage: undefined,
    prompts: [],
    temperature: 1,
    showPromptbar: true,
    showChatbar: true,
    currentFolder: undefined,
    messageError: false,
    searchTerm: "",
    defaultModelId: undefined,
    serverSideApiKeyIsSet: false,
    serverSidePluginKeysSet: false,
};
