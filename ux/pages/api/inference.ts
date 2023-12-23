import { WINGMAN_CONTROL_SERVER_URL, WingmanItem } from "@/types/wingman";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse<WingmanItem[]>) =>
{
    try {
        const fs = await fetch(`${WINGMAN_CONTROL_SERVER_URL}/api/inference`);
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
