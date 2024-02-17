import { HostAddress } from "@/components/Settings/HostAddress";
import { Import } from "../../Settings/Import";
import { Key } from "../../Settings/Key";
import { SidebarButton } from "../../Sidebar/SidebarButton";
import ChatbarContext from "../Chatbar.context";
import { ClearConversations } from "./ClearConversations";
import { PluginKeys } from "./PluginKeys";
import { SettingDialog } from "@/components/Settings/SettingDialog";
import HomeContext from "@/pages/api/home/home.context";
import { IconFileExport, IconRobot, IconSettings } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { useContext, useState } from "react";
import { WINGMAN_SERVER_DEFAULT_HOST } from "@/types/wingman";
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
                text={t("Export data")}
                icon={<IconFileExport size={18} />}
                onClick={() => handleExportData()}
            />

            {/* <SidebarButton
                text={t("Settings")}
                icon={<IconSettings size={18} />}
                onClick={() => setIsSettingDialog(true)}
            /> */}

            <SidebarButton
                text={t("Theme")}
                icon={<IconSettings size={18} />}
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
