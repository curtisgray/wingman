/* eslint-disable @typescript-eslint/no-explicit-any */
import { useFetch } from "@/hooks/useFetch";
import { AIModel, AIModelID, AIModels, VendorName, Vendors } from "@/types/ai";
import { ChatBody, Message } from "@/types/chat";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, SYSTEM_MAX_TOKENS as TOKEN_BUFFER, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION, AZURE_DEPLOYMENT_ID, SYSTEM_MAX_TOKENS } from "@/utils/app/const";
import { type ParsedEvent, type ReconnectInterval, createParser } from "eventsource-parser";
import tiktokenEncoder from "@dqbd/tiktoken/encoders/cl100k_base.json";
import { Tiktoken, init } from "@dqbd/tiktoken/lite/init";
import { WingmanConfig } from "@/types/wingman";

export interface GetModelsRequestProps
{
    key: string;
    url: string;
}

class OpenAIError extends Error
{
    type: string;
    param: string;
    code: string;

    constructor (message: string, type: string, param: string, code: string)
    {
        super(message);
        this.name = "OpenAIError";
        this.type = type;
        this.param = param;
        this.code = code;
    }
}

const useApiService = (config: WingmanConfig) =>
{
    const fetchService = useFetch();

    const OpenAIStream = async (
        model: AIModel,
        systemPrompt: string,
        temperature: number,
        key: string,
        messages: Message[],
        vendor: VendorName,
        signal?: AbortSignal
    ) =>
    {
        let vendorDisplayName = "";
        let host = "";
        switch (vendor) {
            case "openai":
                host = OPENAI_API_HOST;
                vendorDisplayName = "OpenAI API";
                break;
            case "meta":
                host = `http://${config.serverHost}:${config.inferencePort}`;
                vendorDisplayName = "Wingman";
                break;
            default:
                throw new Error(`Unknown vendor: ${vendor}`);
        }

        let url = `${host}/v1/chat/completions`;
        console.log(`${vendorDisplayName}: url=${url}`);

        if (OPENAI_API_TYPE === "azure") {
            url = `${OPENAI_API_HOST}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
        }
        const res = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(OPENAI_API_TYPE === "openai" && {
                    Authorization: `Bearer ${key
                        }`,
                }),
                ...(OPENAI_API_TYPE === "azure" && {
                    "api-key": `${key}`,
                }),
                ...(OPENAI_API_TYPE === "openai" &&
                    OPENAI_ORGANIZATION && {
                    "OpenAI-Organization": OPENAI_ORGANIZATION,
                }),
            },
            method: "POST",
            body: JSON.stringify({
                ...((vendor === "openai" || vendor === "meta") && { model: model.id }),
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    ...messages,
                ],
                max_tokens: SYSTEM_MAX_TOKENS,
                temperature: temperature,
                stream: true,
            }),
            signal,
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        if (res.status !== 200) {
            const result = await res.json();
            if (result.error) {
                throw new OpenAIError(
                    result.error.message,
                    result.error.type,
                    result.error.param,
                    result.error.code
                );
            } else {
                throw new Error(
                    `${vendorDisplayName} returned an error: ${decoder.decode(result?.value) || result.statusText
                    }`
                );
            }
        }

        const stream = new ReadableStream({
            async start(controller)
            {
                const onParse = (event: ParsedEvent | ReconnectInterval) =>
                {
                    if (event.type === "event") {
                        const data = event.data;

                        try {
                            const json = JSON.parse(data);
                            if (json.choices[0].finish_reason != null) {
                                controller.close();
                                return;
                            }
                            const text = json.choices[0].delta.content;
                            const queue = encoder.encode(text);
                            controller.enqueue(queue);
                        } catch (e) {
                            controller.error(e);
                        }
                    }
                };

                const parser = createParser(onParse);

                if (res.body == null) {
                    throw new Error("Response body is null");
                }
                const reader = res.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    parser.feed(decoder.decode(value));
                }
            },
        });

        return stream;
    };
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

            const ores = await fetchWithRetry(`http://${config.serverHost}:${config.controlPort}/api/models`);
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
            await init((imports: WebAssembly.Imports | undefined) => WebAssembly.instantiate(wasm, imports));
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
