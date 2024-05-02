import { AIModel, AIModelID, AIModels, Vendors } from "@/types/ai";
import
{
    OPENAI_API_HOST,
    OPENAI_API_TYPE,
    OPENAI_API_VERSION,
    OPENAI_ORGANIZATION,
} from "@/utils/app/const";
// import * as si from 'systeminformation';
// import os from 'os';
import { NextApiRequest, NextApiResponse } from "next";
import { default as logger } from "@/utils/logger.winston";
import { GetWingmanControlServerUrl } from "@/types/wingman";

export const config = {
    api: {
        responseLimit: false,
    },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) =>
{
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
                logger.error(`Attempt ${i + 1} failed with error: ${error}`);
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

    try {
        // ensure request body is json
        let json = {};
        if (req.headers["content-type"] !== "application/json") {
            json = JSON.parse(req.body);
        } else {
            json = req.body;
        }
        const { key } = json as {
            key: string;
        };

        const models: AIModel[] = [];

        if (key || process.env.OPENAI_API_KEY) {
            let url = `${OPENAI_API_HOST}/v1/models`;
            if (OPENAI_API_TYPE === "azure") {
                url = `${OPENAI_API_HOST}/openai/deployments?api-version=${OPENAI_API_VERSION}`;
            }

            const response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    ...(OPENAI_API_TYPE === "openai" && {
                        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY
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
            });

            if (response.status === 401) {
                return new Response(response.body, {
                    status: 500,
                    headers: response.headers,
                });
            } else if (response.status !== 200) {
                console.error(
                    `OpenAI API returned an error ${response.status
                    }: ${await response.text()}`
                );
                throw new Error("OpenAI API returned an error");
            }

            const json = await response.json();

            models.push(...json.data
                .map((model: any) =>
                {
                    const model_name =
                        OPENAI_API_TYPE === "azure" ? model.model : model.id;
                    // if (model.owned_by === "openai") {
                    //     return {
                    //         id: model.id,
                    //         name: model_name,
                    //         vendor: Vendors.openai.name,
                    //         location: `https://api.openai.com/v1/models/${model_name}`,
                    //         apiKey: key ? key : process.env.OPENAI_API_KEY,
                    //     };
                    // }
                    for (const [k, value] of Object.entries(AIModelID)) {
                        if (value === model_name) {
                            return {
                                id: model.id,
                                name: AIModels[value].name,
                                maxLength: AIModels[value].maxLength,
                                tokenLimit: AIModels[value].tokenLimit,
                                vendor: Vendors.openai.name,
                                location: `https://api.openai.com/v1/models/${model_name}`,
                                apiKey: key ? key : process.env.OPENAI_API_KEY,
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
            throw new Error(`HuggingFace API returned an error ${ores.status}: ${await ores.text()}`);
        }
        // setIsInferables(models);
        res.status(200).json(models);
    } catch (error: unknown) {
        logger.error(`Error: ${error}`);
        if (error instanceof Error) {
            console.log(error.message); // Safe to access `message` because we've checked the type
        } else {
            console.log("An unknown error occurred");
        }
    }
};

export default handler;
