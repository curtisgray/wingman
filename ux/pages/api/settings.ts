// Import dependencies
import { NextApiRequest, NextApiResponse } from "next";
import orm from "@/utils/server/settings.Sqlite";

const handler = async (req: NextApiRequest, res: NextApiResponse) =>
{
    // Ensure the ORM is initialized
    if (!orm.isInitialized()) {
        await orm.initialize();
    }

    try {
        // Handle GET request: retrieve an item
        if (req.method === "GET") {
            const { key } = req.query;

            if (typeof key !== 'string') {
                return res.status(400).json({ error: 'Key must be a string' });
            }

            const value = await orm.getItem(key);
            if (value !== undefined) {
                return res.status(200).json({ key, value });
            } else {
                return res.status(404).json({ error: "Item not found" });
            }
        }
        // Handle POST request: set an item
        else if (req.method === "POST") {
            const { key, value } = req.body;

            if (typeof key !== 'string' || typeof value !== 'string') {
                return res.status(400).json({ error: 'Key and value must be strings' });
            }

            await orm.setItem(key, value);
            return res.status(200).json({ message: "Item set successfully" });
        }
        // Handle DELETE request: remove an item
        else if (req.method === "DELETE") {
            const { key } = req.body;

            if (typeof key !== 'string') {
                return res.status(400).json({ error: 'Key must be a string' });
            }

            await orm.removeItem(key);
            return res.status(200).json({ message: "Item removed successfully" });
        }
        // Handle unsupported methods
        else {
            res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export default handler;
