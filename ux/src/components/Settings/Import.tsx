import { SidebarButton } from "../Sidebar/SidebarButton";
import { SupportedExportFormats } from "@/types/export";
import { IconFileImport } from "@tabler/icons-react";
import { t } from "@/utils/app/i18n";
import { FC } from "react";

interface Props {
    onImport: (data: SupportedExportFormats) => void;
    disabled?: boolean;
}

export const Import: FC<Props> = ({ onImport, disabled = false }) => {
    // const { t } = useTranslation("sidebar");
    return (
        <>
            <input
                id="import-file"
                className="sr-only"
                tabIndex={-1}
                type="file"
                disabled={disabled}
                accept=".json"
                onChange={(e) => {
                    if (!e.target.files?.length) return;

                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        onImport(JSON.parse(e.target?.result as string));
                    };
                    reader.readAsText(file);
                }}
            />

            <SidebarButton
                disabled={disabled}
                text={t("Import data")}
                icon={<IconFileImport size={18} />}
                onClick={() => {
                    const importFile = document.querySelector(
                        "#import-file"
                    ) as HTMLInputElement;
                    if (importFile) {
                        importFile.click();
                    }
                }}
            />
        </>
    );
};
