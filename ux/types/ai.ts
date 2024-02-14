import huggingfaceImage from "@/assets/huggingface.png";
import openaiLightImage from "@/assets/openai-white.png";
import { StaticImageData } from "next/image";

export type VendorName = "openai" | "huggingface";

export interface VendorInfo
{
    isa: "VendorInfo";
    name: VendorName;
    displayName: string;
    logo: StaticImageData;
    isDownloadable: boolean;
    isEnabled: boolean;
}

export interface DownloadableItem
{
    isa: "DownloadableItem";
    modelRepo: string;
    modelRepoName: string;
    filePath: string;
    quantization: string;
    quantizationName: string;
    isDownloaded: boolean;
    available: boolean;
    hasError: boolean;
    location: string;
    downloads: number;
    likes: number;
    created: string;
    updated: string;
}

export interface AIModel
{
    isa: "AIModel";
    id: string; // raw modelRepo name || openai model id
    name: string;   // human-readable modelRepo name || openai model name
    maxLength: number; // maximum length of a message
    tokenLimit: number;
    vendor: VendorName;
    location?: string;
    apiKey?: string;
    items?: DownloadableItem[];
    item?: DownloadableItem;
    downloads: number;
    likes: number;
    created: string;
    updated: string;
    size: string;
    isInferable?: boolean;
}

export interface AIModelInstance
{
    isa: "AIModelInstance";
    alias: string;
    model: AIModel;
    address: string;
    port: number;
}

// TODO: this need to be updated manually for OpenAI models
export enum AIModelID
{
    // GPT_3_5 = "gpt-3.5-turbo",
    // GPT_3_5_16K = "gpt-3.5-turbo-16k",
    // GPT_3_5_AZ = "gpt-35-turbo",
    // GPT_4 = "gpt-4",
    // GPT_4_32K = "gpt-4-32k",
    GPT_4_PREVIEW = "gpt-4-1106-preview", // 128K tokens
    GPT_4_VISION_PREVIEW = "gpt-4-vision-preview", // 128K tokens
    GPT_4 = "gpt-4", // 8K tokens
    GPT_4_32K = "gpt-4-32k", // 32K tokens
    GPT_3_5_TURBO_PREVIEW = "gpt-3.5-turbo-1106", // 16K tokens
    GPT_3_5_TURBO = "gpt-3.5-turbo", // 4K tokens
    GPT_3_5_TURBO_16K = "gpt-3.5-turbo-16k", // 16K tokens
    // GPT_3_5_TURBO_INSTRUCT = "gpt-3.5-turbo-instruct", // 4K tokens
    NO_MODEL_SELECTED = "no-model-selected",
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = AIModelID.NO_MODEL_SELECTED;

export const Vendors: Record<string, VendorInfo> = {
    openai: {
        isa: "VendorInfo",
        name: "openai",
        displayName: "OpenAI",
        logo: openaiLightImage,
        isDownloadable: false,
        isEnabled: true,
    },
    huggingface: {
        isa: "VendorInfo",
        name: "huggingface",
        displayName: "HuggingFace",
        logo: huggingfaceImage,
        isDownloadable: true,
        isEnabled: true,
    },
};

export const AIModels: Record<AIModelID, AIModel> = {
    [AIModelID.NO_MODEL_SELECTED]: {
        isa: "AIModel",
        id: AIModelID.NO_MODEL_SELECTED,
        name: "No Model Selected",
        maxLength: 0,
        tokenLimit: 0,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "",
    },
    [AIModelID.GPT_4_PREVIEW]: {
        isa: "AIModel",
        id: AIModelID.GPT_4_PREVIEW,
        name: "GPT-4 PREVIEW",
        maxLength: 128 * 3 * 1024,
        tokenLimit: 128 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "128K",
    },
    [AIModelID.GPT_4_VISION_PREVIEW]: {
        isa: "AIModel",
        id: AIModelID.GPT_4_VISION_PREVIEW,
        name: "GPT-4 Vision PREVIEW",
        maxLength: 16 * 3 * 1024,
        tokenLimit: 16 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "128K",
    },
    [AIModelID.GPT_4]: {
        isa: "AIModel",
        id: AIModelID.GPT_4,
        name: "GPT-4",
        maxLength: 8 * 3 * 1024,
        tokenLimit: 8 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "8K",
    },
    [AIModelID.GPT_4_32K]: {
        isa: "AIModel",
        id: AIModelID.GPT_4_32K,
        name: "GPT-4",
        maxLength: 32 * 3 * 1024,
        tokenLimit: 32 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "32K",
    },
    [AIModelID.GPT_3_5_TURBO_PREVIEW]: {
        isa: "AIModel",
        id: AIModelID.GPT_3_5_TURBO_PREVIEW,
        name: "GPT-3.5 Turbo PREVIEW",
        maxLength: 16 * 3 * 1024,
        tokenLimit: 16 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "16K",
    },
    [AIModelID.GPT_3_5_TURBO]: {
        isa: "AIModel",
        id: AIModelID.GPT_3_5_TURBO,
        name: "GPT-3.5 Turbo",
        maxLength: 4 * 3 * 1024,
        tokenLimit: 4 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "4K",
    },
    [AIModelID.GPT_3_5_TURBO_16K]: {
        isa: "AIModel",
        id: AIModelID.GPT_3_5_TURBO_16K,
        name: "GPT-3.5 Turbo 16K",
        maxLength: 16 * 3 * 1024,
        tokenLimit: 16 * 1024,
        vendor: Vendors.openai.name,
        downloads: -1,
        likes: -1,
        created: "",
        updated: "",
        size: "16K",
    },
    // [AIModelID.GPT_3_5_TURBO_INSTRUCT]: {
    //     isa: "AIModel",
    //     id: AIModelID.GPT_3_5_TURBO_INSTRUCT,
    //     name: "GPT-3.5 Turbo Instruct",
    //     maxLength: 4 * 3 * 1024,
    //     tokenLimit: 4 * 1024,
    //     vendor: Vendors.openai.name,
    //     downloads: -1,
    //     likes: -1,
    //     created: "",
    //     updated: "",
    //     size: "4K",
    // },
};

export const AIModelList = (): AIModel[] => {
    return Object.values(AIModels);
};
