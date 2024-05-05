import { SidebarButton } from "@/components/Sidebar/SidebarButton";
import { IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { t } from "@/utils/app/i18n";
import { FC, useState } from "react";

interface Props {
    onClearConversations: () => void;
    disabled?: boolean;
}

export const ClearConversations: FC<Props> = ({ onClearConversations, disabled = false }) => {
    const [isConfirming, setIsConfirming] = useState<boolean>(false);

    // const { t } = useTranslation("sidebar");

    const handleClearConversations = () => {
        onClearConversations();
        setIsConfirming(false);
    };

    return isConfirming ? (
        <div className="flex w-full cursor-pointer items-center rounded py-3 px-3 hover:bg-gray-500/10">
            <IconTrash size={18} />

            <div className="ml-3 flex-1 text-left text-xs leading-3 text-white">
                {t("Are you sure?")}
            </div>

            <div className="flex w-[40px]">
                <IconCheck
                    className="ml-auto mr-1 min-w-[20px] text-gray-400 hover:text-gray-100"
                    size={18}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClearConversations();
                    }}
                />

                <IconX
                    className="ml-auto min-w-[20px] text-gray-400 hover:text-gray-100"
                    size={18}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsConfirming(false);
                    }}
                />
            </div>
        </div>
    ) : (
        <SidebarButton
            disabled={disabled}
            text={t("Clear conversations")}
            icon={<IconTrash size={18} />}
            onClick={() => setIsConfirming(true)}
        />
    );
};
