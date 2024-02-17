import {
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
import { WINGMAN_INFERENCE_SERVER_URL } from "@/types/wingman";

export class OpenAIError extends Error {
    type: string;
    param: string;
    code: string;

    constructor(message: string, type: string, param: string, code: string) {
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
    vendor: VendorName
) => {
    let vendorDisplayName = "";
    let host = "";
    switch (vendor) {
        case "openai":
            host = OPENAI_API_HOST;
            vendorDisplayName = "OpenAI API";
            break;
        case "huggingface": // TODO: remove "huggingface" as it's only used in pre-release backend code
        case "meta":
            host = WINGMAN_INFERENCE_SERVER_URL;
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
                Authorization: `Bearer ${
                    key ? key : process.env.OPENAI_API_KEY
                }`,
            }),
            ...(OPENAI_API_TYPE === "azure" && {
                "api-key": `${key ? key : process.env.OPENAI_API_KEY}`,
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
                `${vendorDisplayName} returned an error: ${
                    decoder.decode(result?.value) || result.statusText
                }`
            );
        }
    }

    const stream = new ReadableStream({
        async start(controller) {
            const onParse = (event: ParsedEvent | ReconnectInterval) => {
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

            for await (const chunk of res.body as any) {
                parser.feed(decoder.decode(chunk));
            }
        },
    });

    return stream;
};
