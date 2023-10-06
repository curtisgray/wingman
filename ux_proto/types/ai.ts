import huggingfaceImage from "@/assets/huggingface.png";
import openaiLightImage from "@/assets/openai-white.png";
import { StaticImageData } from "next/image";

export interface VendorInfo
{
    name: string;
    displayName: string;
    logo: StaticImageData;
    isDownloadable: boolean;
    isEnabled: boolean;
}

export interface DownloadableItem
{
    modelRepo: string;
    filePath: string;
    quantization: string;
}

export interface AIModel
{
    id: string;
    name: string;
    maxLength: number; // maximum length of a message
    tokenLimit: number;
    vendor: string;
    location?: string;
    apiKey?: string;
    items?: DownloadableItem[];
    item?: DownloadableItem;
    isDownloaded?: boolean;
}

export enum AIModelID
{
    GPT_3_5 = "gpt-3.5-turbo",
    GPT_3_5_16K = "gpt-3.5-turbo-16k",
    GPT_3_5_AZ = "gpt-35-turbo",
    GPT_4 = "gpt-4",
    GPT_4_32K = "gpt-4-32k",
    GPT_OFFLINE = "gpt-offline",
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = AIModelID.GPT_3_5;

export const Vendors: Record<string, VendorInfo> = {
    openai: {
        name: "openai",
        displayName: "OpenAI",
        logo: openaiLightImage,
        isDownloadable: false,
        isEnabled: true,
    },
    huggingface: {
        name: "huggingface",
        displayName: "HuggingFace",
        logo: huggingfaceImage,
        isDownloadable: true,
        isEnabled: true,
    },
};

export const AIModels: Record<AIModelID, AIModel> = {
    [AIModelID.GPT_OFFLINE]: {
        id: AIModelID.GPT_OFFLINE,
        name: "OFFLINE",
        maxLength: 0,
        tokenLimit: 0,
        vendor: Vendors.openai.name,
    },
    [AIModelID.GPT_3_5]: {
        id: AIModelID.GPT_3_5,
        name: "GPT-3.5",
        maxLength: 4 * 3 * 1024,
        tokenLimit: 4 * 1024,
        vendor: Vendors.openai.name,
    },
    [AIModelID.GPT_3_5_16K]: {
        id: AIModelID.GPT_3_5_16K,
        name: "GPT-3.5-16K",
        maxLength: 16 * 3 * 1024,
        tokenLimit: 16 * 1024,
        vendor: Vendors.openai.name,
    },
    [AIModelID.GPT_3_5_AZ]: {
        id: AIModelID.GPT_3_5_AZ,
        name: "GPT-3.5",
        maxLength: 4 * 3 * 1024,
        tokenLimit: 4 * 1024,
        vendor: Vendors.openai.name,
    },
    [AIModelID.GPT_4]: {
        id: AIModelID.GPT_4,
        name: "GPT-4",
        maxLength: 8 * 3 * 1024,
        tokenLimit: 8 * 1024,
        vendor: Vendors.openai.name,
    },
    [AIModelID.GPT_4_32K]: {
        id: AIModelID.GPT_4_32K,
        name: "GPT-4-32K",
        maxLength: 32 * 3 * 1024,
        tokenLimit: 32 * 1024,
        vendor: Vendors.openai.name,
    },
};
