import { WingmanContent } from "@/types/wingman";
import { useRef, useState } from "react";

interface WingmanProps
{
    isGenerating: boolean;
    latestItem: WingmanContent | undefined;
    startGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    stopGenerating: () => void;
}

export function useWingmanInference(serverPort: number): WingmanProps
{
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const continueGenerating = useRef<boolean>(true);
    const [latestItem, setLatestItem] = useState<WingmanContent>();
    const startGenerating = async (content: string, probabilities_to_return?: number): Promise<void> =>
        new Promise<void>((resolve, reject) =>
        {
            setLatestItem(undefined);
            try {
                const controller = new AbortController();
                fetch(encodeURI(`http://localhost:${serverPort}/completion`), {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/event-stream"
                    },
                    signal: controller.signal,
                    body: JSON.stringify({ prompt: content, n_keep: -1, stream: true, n_probs: probabilities_to_return ?? 0 })
                }).then(async response =>
                {
                    if (!response.ok) {
                        throw new Error(`Server responded with ${response.statusText}`);
                    }
                    const data = response.body;

                    if (data === null) {
                        const errorString = "Response body is null";
                        console.error(errorString);
                        reject(new Error(errorString));
                    } else {
                        const reader = data.getReader();
                        const decoder = new TextDecoder();
                        let done = false;
                        let text = "";
                        setIsGenerating(true);
                        continueGenerating.current = true;
                        while (!done) {
                            if (!continueGenerating.current) {
                                controller.abort();
                                done = true;
                                break;
                            }
                            const { value, done: doneReading } = await reader.read();
                            done = doneReading;
                            const chunkValue = decoder.decode(value);
                            if (chunkValue === "") {
                                continue;
                            }
                            // grab everything between "data: " and "\n\n"
                            text += chunkValue;
                            const data = text.split("data: ")[1]?.split("\n\n")[0];
                            if (data === undefined) {
                                continue;
                            }
                            const content = JSON.parse(data) as WingmanContent;
                            setLatestItem(content);
                            text = "";
                        }
                        setIsGenerating(false);
                        resolve();
                    }
                });
            } catch (error) {
                const errorString = new Error(`Error in sendPrompt: ${error}`);
                console.error(errorString);
                return Promise.reject(errorString);
            }
        });
    const stopGenerating = (): void =>
    {
        continueGenerating.current = false;
    };

    return { isGenerating, latestItem, startGenerating, stopGenerating };
}
