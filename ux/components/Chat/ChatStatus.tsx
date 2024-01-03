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
}

const ChatStatus = ({ onSettings, onClearConversation, iconSize = 18, showStatus = true }: Props) => {
    const {
        state: { globalModel },
    } = useContext(HomeContext);

    const [modelIsDownloadable, setModelIsDownloadable] = React.useState<boolean>(false);

    const displayModel = (model: AIModel | undefined) => {
        if (!model) return <></>;
        const vendor = Vendors[model.vendor];
        if (!vendor) return <></>;
        if (vendor.isDownloadable) {
            return (
                <div className="flex space-x-1">
                    <Image
                        src={vendor.logo}
                        width={iconSize + 5}
                        height={iconSize}
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
                    height={iconSize}
                    alt={vendor.displayName}
                />
                <span className="pt-1">{vendor.displayName}</span>
                <span className="pt-1">{model.name}</span>
            </div>
        );
    };

    useEffect(() => {
        if (globalModel && globalModel.vendor) {
            const v = Vendors[globalModel.vendor];
            if (v && v.isDownloadable) {
                setModelIsDownloadable(true);
            } else {
                setModelIsDownloadable(false);
            }
        }
    }, [globalModel]);

    return (
        <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
            { showStatus && (displayModel(globalModel)) }
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