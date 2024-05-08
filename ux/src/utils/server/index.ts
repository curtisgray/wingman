import
    {
        AZURE_DEPLOYMENT_ID,
        OPENAI_API_HOST,
        OPENAI_API_TYPE,
        OPENAI_API_VERSION,
        OPENAI_ORGANIZATION,
        SYSTEM_MAX_TOKENS,
    } from "../app/const";
import { Message } from "@/types/chat";
import { AIModel, VendorName } from "@/types/ai";
import { ParsedEvent, ReconnectInterval, createParser } from "eventsource-parser";
import { GetWingmanInferenceServerUrl } from "@/types/wingman";

export class OpenAIError extends Error
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

export const OpenAIStream = async (
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
            host = GetWingmanInferenceServerUrl();
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
