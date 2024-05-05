/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFetch } from "@/hooks/useFetch";
import { AIModel, AIModelID, AIModels, Vendors } from "@/types/ai";
import { ChatBody, Message } from "@/types/chat";
import { GetWingmanControlServerUrl } from "@/types/wingman";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, SYSTEM_MAX_TOKENS as TOKEN_BUFFER, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from "@/utils/app/const";
import { OpenAIStream, OpenAIError } from "@/utils/server";
// import wasm from "../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module";
// import wasm from "../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm";
// import * as wasm from "@dqbd/tiktoken/lite/tiktoken_bg.wasm";
import tiktokenEncoder from "@dqbd/tiktoken/encoders/cl100k_base.json";
import { Tiktoken, init } from "@dqbd/tiktoken/lite/init";

export interface GetModelsRequestProps
{
    key: string;
    url: string;
}

const useApiService = () =>
{
    const fetchService = useFetch();

    const fetchWithRetry = async (url: string, retries: number = 3, delay: number = 1000): Promise<Response> =>
    {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`API returned an error ${response.status}: ${await response.text()}`);
                }
                return response; // Return the successful response
            } catch (error: unknown) {
                console.error(`Attempt ${i + 1} failed with error: ${error}`);
                if (error instanceof Error) {
                    console.error(`Attempt ${i + 1} failed with error: ${error.message}`);
                    throw error;
                } else if (error instanceof TypeError && error.message === "Failed to fetch") { // Check if the error is a network error that might indicate the service is down
                    console.log("The service might be down. Retrying...");
                    if (i === retries - 1) throw new Error("Service is down or unreachable after maximum retries");
                    await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
                } else {
                    // If it's a different type of error, rethrow it immediately without retrying
                    throw error;
                }
            }
        }
        throw new Error("Service is down or unreachable after maximum retries");
    };

    const getModels = async (params: GetModelsRequestProps, signal?: AbortSignal): Promise<AIModel[]> =>
    {
        try {
            const models: AIModel[] = [];

            if (params.key) {
                let url = `${OPENAI_API_HOST}/v1/models`;
                if (OPENAI_API_TYPE === "azure") {
                    url = `${OPENAI_API_HOST}/openai/deployments?api-version=${OPENAI_API_VERSION}`;
                }

                const response = await fetchService.get<any>(url, {
                    headers: {
                        "Content-Type": "application/json",
                        ...(OPENAI_API_TYPE === "openai" && {
                            Authorization: `Bearer ${params.key}`,
                        }),
                        ...(OPENAI_API_TYPE === "azure" && {
                            "api-key": `${params.key}`,
                        }),
                        ...(OPENAI_API_TYPE === "openai" && OPENAI_ORGANIZATION && {
                            "OpenAI-Organization": OPENAI_ORGANIZATION
                        }),
                    },
                    signal,
                });

                if (!response) {
                    return [];
                }

                const json = response;

                models.push(...json
                    .map((model: any) =>
                    {
                        const model_name = OPENAI_API_TYPE === "azure" ? model.model : model.id;
                        for (const [, value] of Object.entries(AIModelID)) {
                            if (value === model_name) {
                                return {
                                    id: model.id,
                                    name: AIModels[value].name,
                                    maxLength: AIModels[value].maxLength,
                                    tokenLimit: AIModels[value].tokenLimit,
                                    vendor: Vendors.openai.name,
                                    location: `https://api.openai.com/v1/models/${model_name}`,
                                    apiKey: params.key,
                                } as AIModel;
                            }
                        }
                    })
                    .filter(Boolean));
            }

            const ores = await fetchWithRetry(`${GetWingmanControlServerUrl()}/api/models`);
            if (ores.ok) {
                const res = await ores.json();
                models.push(...res.models);
            } else {
                throw new Error(`Wingman API returned an error ${ores.status}: ${await ores.text()}`);
            }
            return models;
        } catch (error: unknown) {
            console.error(`Error: ${error}`);
            if (error instanceof Error) {
                console.log(error.message); // Safe to access `message` because we've checked the type
            } else {
                console.log("An unknown error occurred");
            }
            return [];
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const generate = async (chatBody: ChatBody, signal: AbortSignal): Promise<Response> =>
    {
        try {
            const { model, messages, key, systemPrompt, temperature, vendor } = chatBody;

            // download wasm file
            const wasmUrl = new URL("@dqbd/tiktoken/lite/tiktoken_bg.wasm", import.meta.url);
            // const wres = await fetch("@dqbd/tiktoken/lite/tiktoken_bg.wasm");
            const wres = await fetch(wasmUrl, { signal });
            if (!wres.ok) {
                throw new Error(`Failed to fetch wasm file: ${wres.status}`);
            }
            const wasm = await wres.arrayBuffer();
            await init((imports) => WebAssembly.instantiate(wasm, imports));
            const encoding = new Tiktoken(
                tiktokenEncoder.bpe_ranks,
                tiktokenEncoder.special_tokens,
                tiktokenEncoder.pat_str
            );

            let systemPromptToSend = systemPrompt;
            if (!systemPromptToSend) {
                systemPromptToSend = DEFAULT_SYSTEM_PROMPT;
            }

            let temperatureToUse = temperature;
            if (temperatureToUse == null) {
                temperatureToUse = DEFAULT_TEMPERATURE;
            }

            const prompt_tokens = encoding.encode(systemPromptToSend);

            let tokenCount = prompt_tokens.length;
            let messagesToSend: Message[] = [];

            for (let i = messages.length - 1; i >= 0; i--) {
                const message = messages[i];
                let content = message.content;
                if (message.role === "assistant" && message?.rating) {
                    content = `${content}\n{{User Rating: ${message.rating}}}`;
                }

                const tokens = encoding.encode(content);

                if (tokenCount + tokens.length + TOKEN_BUFFER > model.tokenLimit) {
                    break;
                }
                tokenCount += tokens.length;
                messagesToSend = [message, ...messagesToSend];
            }

            encoding.free();

            const stream = await OpenAIStream(
                model,
                systemPromptToSend,
                temperatureToUse,
                key,
                messagesToSend,
                vendor,
                signal
            );

            return new Response(stream);
        } catch (error) {
            console.error(error);
            if (error instanceof OpenAIError) {
                return new Response("Error", {
                    status: 500,
                    statusText: error.message,
                });
            } else {
                return new Response("Error", {
                    status: 500,
                    statusText: error ? error.toString() : "Unknown error"
                });
            }
        }
    };

    return {
        getModels,
        generate,
    };
};

export default useApiService;
