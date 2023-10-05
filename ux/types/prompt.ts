import { AIModel } from "@/types/ai";

export interface Prompt {
    id: string;
    name: string;
    description: string;
    content: string;
    model: AIModel;
    folderId: string | null;
}
