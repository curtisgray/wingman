import { AIModel, VendorName } from "@/types/ai";

export type MessageRating = 'hate' | 'dislike' | 'like' | 'love';

export interface Message {
    role: Role;
    content: string;
    name?: string;
    rating?: MessageRating;
    timestamp: number;
    modelAlias?: string;
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
    systemPrompt: string;
    temperature: number;
    folderId: string | null;
}
