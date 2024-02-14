import React, { useContext, useEffect } from "react";
import WingmanInferenceStatus from "./WingmanInferenceStatus";
import { IconClearAll, IconSettings } from "@tabler/icons-react";
import HomeContext from "@/pages/api/home/home.context";
import { AIModel, Vendors } from "@/types/ai";
import Image from "next/image";

interface Props {
    onSettings: () => void;
    onClearConversation: () => void;
    iconSize?: number;
    showStatus?: boolean;
    disabled?: boolean;
}

const ChatStatus = ({ onSettings, onClearConversation, iconSize = 18, showStatus = true, disabled = false }: Props) => {
    const {
        state: { globalModel },
    } = useContext(HomeContext);

    const displayGlobalModel = () => {
        if (!globalModel){
            console.log("ChatStatus: globalModel is undefined");
            return <></>;
        }
        const vendor = Vendors[globalModel.vendor];
        if (!vendor) return <></>;
        if (vendor.isDownloadable) {
            return (
                <div className="flex space-x-1">
                    <Image
                        src={vendor.logo}
                        width={iconSize}
                        alt={vendor.displayName}
                    />
                    <WingmanInferenceStatus className="py-1" showTitle={false} />
                </div>
            );
        }
        return (
            <div className="flex space-x-1">
                <Image
                    src={vendor.logo}
                    width={iconSize}
                    alt={vendor.displayName}
                />
                <span>{vendor.displayName}</span>
                <span>{globalModel.name}</span>
            </div>
        );
    };

    return (
        <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
            { showStatus && (displayGlobalModel()) }
            <button type="button" title="Open settings" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}} className="ml-2 cursor-pointer hover:opacity-50" onClick={onSettings}>
                <IconSettings size={iconSize} />
            </button>
            {/* <button type="button" title="Clear conversation" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}} className="ml-2 cursor-pointer hover:opacity-50" onClick={onClearConversation}>
                <IconClearAll size={iconSize} />
            </button> */}
        </div>
    );
};

export default ChatStatus;