import { Import } from "../../Settings/Import";
import { Key } from "../../Settings/Key";
import { SidebarButton } from "../../Sidebar/SidebarButton";
import ChatbarContext from "../Chatbar.context";
import { ClearConversations } from "./ClearConversations";
import { PluginKeys } from "./PluginKeys";
import { SettingDialog } from "@/components/Settings/SettingDialog";
import HomeContext from "@/pages/api/home/home.context";
import { IconBrush, IconFileExport, IconRobot, IconSettings } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { useContext, useState } from "react";
import { ChatSettingsDialog } from "@/components/Chat/ChatSettingsDialog";

export const ChatbarSettings = () => {
    const { t } = useTranslation("sidebar");
    const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);
    const [isChatSettingsDialogOpen, setIsChatSettingsDialogOpen] = useState<boolean>(false);

    const {
        state: {
            apiKey,
            serverSideApiKeyIsSet,
            serverSidePluginKeysSet,
            conversations,
            messageIsStreaming,
        },
    } = useContext(HomeContext);

    const {
        handleClearConversations,
        handleImportConversations,
        handleExportData,
        handleApiKeyChange,
    } = useContext(ChatbarContext);
    
    return (
        <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
            <SidebarButton
                disabled={messageIsStreaming}
                text={t("Choose AI model")}
                icon={<IconRobot size={18} />}
                onClick={() => setIsChatSettingsDialogOpen(true)} />
                
            {conversations.length > 0 ? (
                <ClearConversations
                    onClearConversations={handleClearConversations}
                />
            ) : null}

            <Import onImport={handleImportConversations} />

            <SidebarButton
                disabled={messageIsStreaming}
                text={t("Export data")}
                icon={<IconFileExport size={18} />}
                onClick={() => handleExportData()}
            />

            <SidebarButton
                disabled={messageIsStreaming}
                text={t("Theme")}
                icon={<IconBrush size={18} />}
                onClick={() => setIsSettingDialog(true)}
            />

            {!serverSideApiKeyIsSet ? (
                <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
            ) : null}

            {/* <HostAddress value={wingmanHostAddress} onChange={setWingmanHostAddress} /> */}
            
            {!serverSidePluginKeysSet ? <PluginKeys /> : null}

            <ChatSettingsDialog open={isChatSettingsDialogOpen} onClose={() => setIsChatSettingsDialogOpen(false) } />
            <SettingDialog open={isSettingDialogOpen} onClose={() => setIsSettingDialog(false) } />
        </div>
    );
};
