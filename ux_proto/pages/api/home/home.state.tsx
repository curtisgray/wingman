import { AIModel, AIModelID } from "@/types/ai";
import { Conversation } from "@/types/chat";
import { DownloadItem, DownloadServer } from "@/types/download";

export interface HomeInitialState
{
    isOnline: boolean;
    downloadItems: DownloadItem[];
    serverStatus: DownloadServer;

    models: AIModel[];
    conversations: Conversation[];
    selectedConversation: Conversation | undefined;
    defaultModelId: AIModelID | undefined;
}
const initialConversation: Conversation = {
    id: "1",
    name: "test",
    messages: [
        {
            role: "user",
            content: "hello",
        },
        {
            role: "assistant",
            content: "well, hello there"
        }
    ],
    model: {
        id: "llamamodel",
        name: "the llama model",
        maxLength: 0,
        tokenLimit: 0,
        vendor: "huggingface"
    },
    prompt: "",
    temperature: 1,
    folderId: null
};
export const initialState: HomeInitialState = {
    isOnline: false,
    downloadItems: [],
    serverStatus: {
        status: "unknown",
        created: 0,
        updated: 0,
    },
    models: [],
    selectedConversation: initialConversation,
    defaultModelId: undefined,
    conversations: [initialConversation]
};
