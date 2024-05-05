import { WingmanReleaseNotesDialog } from "@/components/Chat/WingmanReleaseNotesDialog";
import { FC, useState } from "react";

interface Props {}

export const PromptbarSettings: FC<Props> = () => {
    // const { t } = useTranslation("sidebar");
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState<boolean>(false);

    return (
        <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
            <WingmanReleaseNotesDialog open={isSettingsDialogOpen} onClose={() => setIsSettingsDialogOpen(false)} />
        </div>
    );
};
