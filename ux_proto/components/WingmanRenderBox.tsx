import React from "react";
import { useWingman } from "@/hooks/useWingman";
// import prompts from "@/prompts";
import drone from "@/prompts/drone.prompt.json";
import reddit from "@/prompts/reddit.prompt.json";
import { WingmanContent } from "@/types/wingman";
import { useEffect, useRef, useState } from "react";
import { useScrollDirection } from "react-use-scroll-direction";

interface WingmanRenderBoxProps
{
    className?: string;
}

const WingmanRenderBox = ({ className = "" }: WingmanRenderBoxProps) =>
{
    const { isGenerating, startGenerating, stopGenerating, latestItem: item } = useWingman(6567);
    const [items, setItems] = useState<WingmanContent[]>([]);
    const messageEndRef = useRef<HTMLDivElement>(null);
    const [beAutoScrolling, setBeAutoScrolling] = useState(true);
    const { isScrollingUp } = useScrollDirection();

    function sendDronePrompt()
    {
        setItems([]);
        startGenerating(drone.prompt, 0);
        console.log("sent drone prompt");
    }

    function sendRedditPrompt()
    {
        setItems([]);
        startGenerating(reddit.prompt, 0);
        console.log("sent drone prompt");
    }

    const scrollToBottom = () =>
    {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() =>
    {
        if (isScrollingUp) {
            setBeAutoScrolling(false);
        }
        if (beAutoScrolling) {
            scrollToBottom();
        }
    }, [beAutoScrolling, isScrollingUp, items]);

    useEffect(() =>
    {
        if (isGenerating) {
            if (item !== undefined)
                setItems([...items, item]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGenerating, item]);

    return (
        <div className={`${className} flex`}>
            <div className="flex flex-row p-2 space-x-2 flex-auto bg-slate-700">
                <div className="flex flex-auto overflow-auto bg-slate-800" ref={messageEndRef}>
                    <p className="flex-auto m-2 text-sm">
                        {items.map((item) => item.content)}
                    </p>
                </div>
                {isGenerating === false && <div className="grid items-center">
                    <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase leading-normal text-neutral-800"
                        onClick={sendDronePrompt}>drone</button>
                    <button className="text-center rounded h-12 p-4 bg-neutral-50 text-xs font-medium uppercase leading-normal text-neutral-800"
                        onClick={sendRedditPrompt}>reddit</button>
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