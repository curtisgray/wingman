import { AIModel, AIModelID, AIModels, Vendors } from "@/types/ai";
import { WINGMAN_CONTROL_SERVER_URL } from "@/types/wingman";
import
{
    HF_MODEL_ENDS_WITH,
    HF_THEBLOKE_MODELS_URL,
    HF_THEBLOKE_MODEL_URL,
    OPENAI_API_HOST,
    OPENAI_API_TYPE,
    OPENAI_API_VERSION,
    OPENAI_ORGANIZATION,
} from "@/utils/app/const";

export const config = {
    runtime: "edge",
};

const handler = async (req: Request): Promise<Response> =>
{
    try {
        const { key } = (await req.json()) as {
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

        const ores = await fetch(`${WINGMAN_CONTROL_SERVER_URL}/api/models`);
        if (ores.ok) {
            const res = await ores.json();
            models.push(...res.models);
        } else {
            throw new Error(`HuggingFace API returned an error ${ores.status}: ${await ores.text()}`);
        }
        return new Response(JSON.stringify(models), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response("Error", { status: 500 });
    }
};

export default handler;
