import React, { useContext } from "react";
import WingmanInferenceStatus from "./WingmanInferenceStatus";
import HomeContext from "@/pages/api/home/home.context";
import { Vendors } from "@/types/ai";
import { displayVendorIcon } from "./Util";

interface Props
{
    onSettings: () => void;
    onClearConversation: () => void;
    iconSize?: number;
    showStatus?: boolean;
    disabled?: boolean;
}

const ChatStatus = ({ onSettings, onClearConversation, iconSize = 18, showStatus = true, disabled = false }: Props) =>
{
    const {
        state: { globalModel },
    } = useContext(HomeContext);

    const displayGlobalModel = () =>
    {
        if (!globalModel) {
            console.log("ChatStatus: globalModel is undefined");
            return <></>;
        }
        const vendor = Vendors[globalModel.vendor];
        if (!vendor) return <></>;
        if (vendor.isDownloadable) {
            return (
                <div className="flex space-x-1">
                    {displayVendorIcon(vendor, iconSize)}
                    <WingmanInferenceStatus showTitle={false} showQuantization={false} />
                </div>
            );
        }
        return (
            <div className="flex space-x-1">
                {displayVendorIcon(vendor, iconSize)}
                <span>{vendor.displayName}</span>
                <span>{globalModel.name}</span>
            </div>
        );
    };

    return (
        <div className="sticky top-0 z-10 flex justify-center border border-b-gray-300 bg-gray-100 py-2 text-sm text-gray-500 dark:border-none dark:bg-gray-700 dark:text-gray-200">
            {showStatus && (displayGlobalModel())}
            {/* <button type="button" title="Open settings" style={disabled ? { pointerEvents: "none", opacity: "0.4" } : {}} className="ml-2 cursor-pointer hover:opacity-50" onClick={onSettings}>
                <IconSettings size={iconSize} />
            </button> */}
            {/* <button type="button" title="Clear conversation" style={disabled ? {pointerEvents: "none", opacity: "0.4"} : {}} className="ml-2 cursor-pointer hover:opacity-50" onClick={onClearConversation}>
                <IconClearAll size={iconSize} />
            </button> */}
        </div>
    );
};

export default ChatStatus;