import { WingmanItem } from "@/types/wingman";
import { HF_WINGMAN_INFERENCE_URL } from "@/utils/app/const";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse<WingmanItem[]>) =>
{
    try {
        const fs = await fetch(HF_WINGMAN_INFERENCE_URL);
        if (fs.ok) {
            const json = await fs.json();
            const items: WingmanItem[] = [];
            items.push(...json.inferences);
            res.json(items);
        } else {
            // TODO: decide whether to throw an error or return a response
            res.status(500).json([]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json([]);
    }
}

export default handler;
