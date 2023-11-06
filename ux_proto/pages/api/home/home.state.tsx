import { AIModel, AIModelID } from "@/types/ai";
import { Conversation } from "@/types/chat";
import { DownloadItem, DownloadServerAppItem, WingmanWebSocketMessage } from "@/types/download";
import { WingmanItem, WingmanServerAppItem } from "@/types/wingman";

export interface HomeInitialState
{
    isOnline: boolean;
    lastWebSocketMessage: WingmanWebSocketMessage | undefined;
    downloadItems: DownloadItem[];
    wingmanItems: WingmanItem[];
    
    downloadServiceStatus: DownloadServerAppItem;
    inferenceServiceStatus: WingmanServerAppItem;

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
        isa: "AIModel",
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
    lastWebSocketMessage: undefined,
    downloadItems: [],
    wingmanItems: [],
    downloadServiceStatus: {
        isa: "DownloadServerAppItem",
        status: "unknown",
        created: 0,
        updated: 0,
    },
    inferenceServiceStatus: {
        isa: "WingmanServerAppItem",
        status: "unknown",
        alias: "",
        modelRepo: "",
        filePath: "",
        created: 0,
        updated: 0,
    },
    models: [],
    selectedConversation: initialConversation,
    defaultModelId: undefined,
    conversations: [initialConversation],
};
