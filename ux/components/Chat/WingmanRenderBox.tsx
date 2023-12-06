import React, { useContext } from "react";
// import drone from "@/prompts/drone.prompt.long.xwin.json";
// import reddit from "@/prompts/reddit.prompt.xwin.json";
import { useRef } from "react";
import { DownloadProps } from "@/types/download";
import WingmanContext from "@/pages/api/home/wingman.context";

interface WingmanRenderBoxProps
{
    chosenModel: DownloadProps;
    className?: string;
}

const WingmanRenderBox = ({ chosenModel, className = "" }: WingmanRenderBoxProps) =>
{
    // const [items, setItems] = useState<WingmanContent[]>([]);
    const messageEndRef = useRef<HTMLDivElement>(null);
    // const [beAutoScrolling, setBeAutoScrolling] = useState(true);
    // const { isScrollingUp } = useScrollDirection();
    // const { isGenerating, startGenerating, stopGenerating, items } = useWingman(6567, 6568);
    const {
        state: { 
            items,
            isGenerating,
            startGenerating,
            stopGenerating,
        },
    } = useContext(WingmanContext);

    // function sendDronePrompt()
    // {
    //     // setItems([]);
    //     startGenerating(drone.prompt, 0);
    //     console.log("sent drone prompt");
    // }

    // function sendRedditPrompt()
    // {
    //     // setItems([]);
    //     startGenerating(reddit.prompt, 0);
    //     console.log("sent drone prompt");
    // }

    // const scrollToBottom = () =>
    // {
    //     messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // };

    // useEffect(() =>
    // {
    //     if (isScrollingUp) {
    //         setBeAutoScrolling(false);
    //     }
    //     if (beAutoScrolling) {
    //         scrollToBottom();
    //     }
    // }, [beAutoScrolling, isScrollingUp, items]);

    // useEffect(() =>
    // {
    //     if (isGenerating) {
    //         if (latestItem !== undefined)
    //             setItems([...items, latestItem]);
    //     }
    // // eslint-disable-next-line react-hooks/exhaustive-deps
    // }, [isGenerating, latestItem]);

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