import { AIModel, AIModelID, AIModels, DownloadableItem, Vendors } from "@/types/ai";
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
        const models: AIModel[] = [];

        // check if request has a json body
        if (!req.body || req.headers.get("content-type") !== "application/json") {
            // return new Response("Error", { status: 400 });
            console.debug("models handler: no json body with OpenAI key. Skipping OpenAI models.");
        } else {
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
                        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`,
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

            const json = response.ok ? await response.json() :
                {
                    data: [
                        {
                            id: AIModels[AIModelID.GPT_OFFLINE].id,
                            model: AIModels[AIModelID.GPT_OFFLINE].name,
                        },
                    ]
                };

            models.push(...json.data
                .map((model: { id: string, model: string | undefined; }) =>
                {
                    const model_name =
                        OPENAI_API_TYPE === "azure" ? model?.model !== undefined : model.id;
                    for (const [, value] of Object.entries(AIModelID)) {
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
                .filter(Boolean)
            );
        }

        console.debug("models handler: adding HuggingFace models");
        const ores = await fetch(HF_THEBLOKE_MODELS_URL);
        if (ores.ok) {
            console.debug("models handler: HuggingFace models response ok");
            const oj = await ores.json();
            const openModels: AIModel[] = oj
                .map((model: { tags: string, id: string, siblings: { rfilename: string; }[]; }) =>
                {
                    if (model.tags.includes("llama") || model.tags.includes("llama-2")) {
                        // create a map of quantization string to file name
                        // skip any models that don't have a quantization string
                        const quantizationMap = new Map<string, string>();
                        model.siblings.forEach((s: { rfilename: string; }) =>
                        {
                            if (s.rfilename.endsWith(".gguf")) {
                                const quantization = s.rfilename.split(".")[s.rfilename.split(".").length - 2].substring(1);
                                quantizationMap.set(quantization, s.rfilename);
                            }
                        });
                        if (quantizationMap.size > 0) {
                            return {
                                id: model.id,
                                name: model.id.replace("-GGUF", ""),
                                vendor: Vendors.huggingface.name,
                                location: `${HF_THEBLOKE_MODEL_URL}${model.id}`,
                                apiKey: null,
                                items: model.siblings.map((s: { rfilename: string; }) =>
                                {
                                    if (s.rfilename.endsWith(".gguf")) {
                                        const quantization = s.rfilename.split(".")[s.rfilename.split(".").length - 2].substring(1);
                                        return {
                                            modelRepo: model.id,
                                            filePath: s.rfilename,
                                            quantization: quantization
                                        } as DownloadableItem;
                                    }
                                }).filter(Boolean)
                            };
                        }
                    }
                }).filter(Boolean);
            models.push(...openModels);
        } else {
            console.debug(`models handler: HuggingFace models response not ok: ${ores.status}`);
            return new Response("Error", { status: ores.status });
        }
        return new Response(JSON.stringify(models), { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response("Error", { status: 500 });
    }
};

export default handler;
