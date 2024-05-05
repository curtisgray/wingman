import { useContext, useState } from "react";
import HomeContext from "@/home.context";
import WingmanDownloadStatus from "./WingmanDownloadStatus";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import SelectedConversationModelStatus from "./SelectedConversationModelStatus";

interface Props
{
    showStatus?: boolean;
    disabled?: boolean;
}

const ChatStatus = ({ showStatus = true, disabled = false }: Props) =>
{
    const {
        handleSetVisiblePage
    } = useContext(HomeContext);
    const [isChatSettingsDialogOpen, setIsChatSettingsDialogOpen] = useState<boolean>(false);

    const displayDownloadStatus = () => {
        return <><WingmanDownloadStatus showProgressText={false} showFileName={false} showProgress={true} /></>;
    };

    return (
        <div className="sticky top-0 z-10 flex justify-center border border-b-gray-300 bg-gray-100 py-2 text-sm text-gray-500 dark:border-none dark:bg-gray-700 dark:text-gray-200">
            {showStatus && (
                <div className="flex space-x-16">
                    <button disabled={disabled} onClick={() => handleSetVisiblePage('chooseModel')} className="text-left w-full disabled:cursor-not-allowed">
                        <SelectedConversationModelStatus showQuantization={false} />
                    </button>
                    
                    {displayDownloadStatus()}
                </div>
            )}
            <ChatSettingsDialog open={isChatSettingsDialogOpen} onClose={() => setIsChatSettingsDialogOpen(false)} />
        </div>
    );
};

export default ChatStatus;