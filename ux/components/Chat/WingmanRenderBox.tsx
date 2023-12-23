import React, { useContext } from "react";
// import drone from "@/prompts/drone.prompt.long.xwin.json";
// import reddit from "@/prompts/reddit.prompt.xwin.json";
import { useRef } from "react";
import { DownloadProps } from "@/types/download";
import { useRequestInferenceAction } from "@/hooks/useRequestInferenceAction";

interface WingmanRenderBoxProps
{
    chosenModel: DownloadProps;
    className?: string;
}

const WingmanRenderBox = ({ className = "" }: WingmanRenderBoxProps) =>
{
    const messageEndRef = useRef<HTMLDivElement>(null);

    const { startGenerating, stopGenerating, items, isGenerating } = useRequestInferenceAction();

    return (
        <div className={`${className} flex`}>
            <div className="flex flex-row p-2 space-x-2 flex-auto bg-slate-700">
                <div className="flex flex-auto overflow-auto bg-slate-800" ref={messageEndRef}>
                    <p className="flex-auto m-2 text-sm">
                        {items.map((item) => item.content)}
                    </p>
                </div>
                {isGenerating === false && <div className="grid items-center">
                    {/* <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase leading-normal text-neutral-800"
                        onClick={sendDronePrompt}>drone</button>
                    <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase leading-normal text-neutral-800"
                        onClick={sendRedditPrompt}>reddit</button> */}
                </div>}
                {isGenerating === true && <div className="grid items-center">
                    <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase leading-normal text-neutral-800"
                        onClick={stopGenerating}>stop</button>
                </div>}
            </div>
        </div>
    );
};

export default WingmanRenderBox;