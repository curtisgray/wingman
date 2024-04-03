import { WingmanReleaseNotesDialog } from "@/components/Chat/WingmanReleaseNotesDialog";
import { SidebarButton } from "@/components/Sidebar/SidebarButton";
import HomeContext from "@/pages/api/home/home.context";
import { IconCircleLetterR } from "@tabler/icons-react";
import { FC, useContext, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {}

export const PromptbarSettings: FC<Props> = () => {
    const { t } = useTranslation("sidebar");
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState<boolean>(false);
    const {
        state: {
            isMessageStreaming,
        },
    } = useContext(HomeContext);
    return (
        <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
            {/* <SidebarButton
                disabled={isMessageStreaming}
                text={t("Release notes")}
                icon={<IconCircleLetterR size={18} />}
                onClick={() => setIsSettingsDialogOpen(true)} /> */}

            <WingmanReleaseNotesDialog open={isSettingsDialogOpen} onClose={() => setIsSettingsDialogOpen(false)} />
        </div>
    );
};
