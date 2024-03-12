import { AIModel, AIModelID, AIModels, Vendors } from "@/types/ai";
import { WINGMAN_CONTROL_SERVER_URL } from "@/types/wingman";
import
{
    OPENAI_API_HOST,
    OPENAI_API_TYPE,
    OPENAI_API_VERSION,
    OPENAI_ORGANIZATION,
} from "@/utils/app/const";
import * as si from 'systeminformation';
import os from 'os'
import { NextApiRequest, NextApiResponse } from "next";

export const config = {
    api: {
        responseLimit: false,
    },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) =>
{
    let controllers: si.Systeminformation.GraphicsControllerData[] = [];
    try {
        const gpuInfo = await si.graphics();
        controllers = gpuInfo.controllers;

    } catch (error) {
        throw new Error(`${error}`);
    }

    const isInferable = (model: AIModel) =>
    {
        if (!Vendors[model.vendor].isDownloadable) return true;
        if (!model.size) return false;
        // check if the model can be run on the current gpu and memory
        //   by comparing the model size to the amount of gpu, or memory if
        //   there is no gpu
        let noVram = false;
        let availableMemory = -1;
        if (controllers.length === 0) {
            availableMemory = os.freemem();
        } else {
            // changed from using 'memoryFree' to 'vram' because the inference
            //    engine could be using vram and skew the results
            // TODO: move this entire function to the server and calculate
            //   the available memory based on whether inference is running
            // if ('memoryFree' in controllers[0]) availableMemory =
            //     controllers[0].memoryFree ? controllers[0].memoryFree : -1;
            // else availableMemory = controllers[0].vram ? controllers[0].vram : -1;
            let index = 0;
            if (controllers.length > 1)
                index = 1;
            availableMemory = controllers[index].vram || -1;
        }
        if (availableMemory === -1) return false;

        // paramSize is the last character of the model size
        const parameterSizeIndicator = model.size.slice(-1);
        // check if model is MoE by looking for an 'x' in the size
        const isMoe = model.size.includes('x');
        let sizeMultiplier = -1;
        switch (parameterSizeIndicator) {
            case 'K':
                sizeMultiplier = 1000;
                break;
            case 'M':
                sizeMultiplier = 1000000;
                break;
            case 'B':
                sizeMultiplier = 1000000000;
                break;
            case 'T':
                sizeMultiplier = 1000000000000;
                break;
            case 'Q':
                sizeMultiplier = 1000000000000000;
                break;
        }
        if (sizeMultiplier === -1) return false;
        let moeMultiplier = 1;
        let parameterValue = 0;
        if (isMoe) {
            const moeSize = model.size.split('x');
            moeMultiplier = Number(moeSize[0]);
            const parameterSize = Number(moeSize[1].substring(0, moeSize[1].length - 1));
            parameterValue = parameterSize * moeMultiplier;
        } else {
            parameterValue = Number(model.size.substring(0, model.size.length - 1));
        }
        const quantizedBits = 4;
        const quantizedSize = parameterValue * quantizedBits * sizeMultiplier / 8;
        const quantizedMemRequired = quantizedSize / sizeMultiplier;
        const normalizedQuantizedMemRequired = quantizedMemRequired * 1024;
        if (normalizedQuantizedMemRequired <= availableMemory) return true;
        return false;
    };

    const setIsInferables = (models: AIModel[]) =>
    {
        if (models && models.length > 0) {
            // set isInferable to true for each model that can be run on the current gpu and memory
            for (let i = 0; i < models.length; i++) {
                models[i].isInferable = isInferable(models[i]);
            }
        }
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

        const ores = await fetchWithRetry(`${WINGMAN_CONTROL_SERVER_URL}/api/models`);
        if (ores.ok) {
            const res = await ores.json();
            models.push(...res.models);
        } else {
            throw new Error(`HuggingFace API returned an error ${ores.status}: ${await ores.text()}`);
        }
        setIsInferables(models);
        res.status(200).json(models);
    } catch (error: unknown) {
    if (error instanceof Error) {
            console.log(error.message); // Safe to access `message` because we've checked the type
        } else {
            console.log("An unknown error occurred");
        }
    }
};

export default handler;