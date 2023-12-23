import { AIModel, VendorName } from "@/types/ai";

export interface Message {
    role: Role;
    content: string;
    name?: string;
}

export type Role = "assistant" | "user";

export interface ChatBody {
    model: AIModel;
    messages: Message[];
    key: string;
    systemPrompt?: string;
    temperature: number;
    vendor: VendorName;
}

export interface Conversation {
    id: string;
    name: string;
    messages: Message[];
    model: AIModel;
    inferringAlias: string;
    systemPrompt: string;
    temperature: number;
    folderId: string | null;
}
