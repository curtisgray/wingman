import { AIModel, AIModelID, AIModels, Vendors } from "@/types/ai";
import
{
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

        const models: AIModel[] = json.data
            .map((model: any) =>
            {
                const model_name =
                    OPENAI_API_TYPE === "azure" ? model.model : model.id;
                for (const [key, value] of Object.entries(AIModelID)) {
                    if (value === model_name) {
                        return {
                            id: model.id,
                            name: AIModels[value].name,
                            vendor: Vendors.openai.name,
                            location: AIModels[value].location,
                            apiKey: AIModels[value].apiKey,
                        };
                    }
                }
            })
            .filter(Boolean);

        const ores = await fetch(HF_THEBLOKE_MODELS_URL);
        if (ores.status === 200) {
            const oj = await ores.json();
            const openModels: AIModel[] = oj
                .map((model: any) =>
                {
                    if (model.tags.includes("llama") || model.tags.includes("llama-2")) {
                        return {
                            id: model.id,
                            name: model.id.replace("-GGML", ""),
                            vendor: Vendors.huggingface.name,
                            location: `${HF_THEBLOKE_MODEL_URL}${model.id}`,
                            apiKey: null,
                            quantizations: model.siblings.map((s: any) =>
                            {
                                if (s.rfilename.includes(".bin")) {
                                    const quant = s.rfilename.split(".")[s.rfilename.split(".").length - 2].substring(1);
                                    return quant;
                                }
                            }).filter(Boolean)
                        };
                    }
                }).filter(Boolean);
            models.push(...openModels);
        }
        return new Response(JSON.stringify(models), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response("Error", { status: 500 });
    }
};

export default handler;
