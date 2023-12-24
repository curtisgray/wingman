import React from "react";
import WingmanInferenceStatus from "./WingmanInferenceStatus";
import { IconClearAll, IconSettings } from "@tabler/icons-react";

interface Props {
    onSettings: () => void;
    onClearConversation: () => void;
    iconSize?: number;
    showStatus?: boolean;
}

const ChatStatus = ({ onSettings, onClearConversation, iconSize = 18, showStatus = true }: Props) => {
    return (
        <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
            {showStatus && (<WingmanInferenceStatus className="py-1" showTitle={false} />)}
            <button className="ml-2 cursor-pointer hover:opacity-50" onClick={onSettings}>
                <IconSettings size={iconSize} />
            </button>
            <button className="ml-2 cursor-pointer hover:opacity-50" onClick={onClearConversation}>
                <IconClearAll size={iconSize} />
            </button>
        </div>
    );
};

export default ChatStatus;