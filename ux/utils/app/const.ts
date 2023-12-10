export const DEFAULT_SYSTEM_PROMPT =
    process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
    "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
    process.env.OPENAI_API_HOST || "https://api.openai.com";

export const DEFAULT_TEMPERATURE = parseFloat(
    process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1"
);

export const OPENAI_API_TYPE = process.env.OPENAI_API_TYPE || "openai";

export const OPENAI_API_VERSION =
    process.env.OPENAI_API_VERSION || "2023-03-15-preview";

export const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION || "";

export const AZURE_DEPLOYMENT_ID = process.env.AZURE_DEPLOYMENT_ID || "";

export const HF_MODEL_ENDS_WITH = "-GGUF";
export const HF_MODEL_FILE_EXTENSION = ".gguf";
export const HF_THEBLOKE_MODELS_URL = process.env.HF_THEBLOKE_MODELS_URL || "https://huggingface.co/api/models?author=TheBloke&search=" + HF_MODEL_ENDS_WITH + "&sort=lastModified&direction=-1&full=full";
export const HF_THEBLOKE_MODEL_URL = process.env.HF_THEBLOKE_MODEL_URL || "https://huggingface.co/TheBloke";
export const HF_WINGMAN_MODELS_URL = "http://localhost:6568/api/models";
export const HF_WINGMAN_DOWNLOADS_URL = "http://localhost:6568/api/downloads";
export const HF_WINGMAN_INFERENCE_URL = "http://localhost:6568/api/inference";