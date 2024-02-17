import { IconRefresh } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { FC } from "react";

interface Props {
    onRegenerate: () => void;
}

export const Regenerate: FC<Props> = ({ onRegenerate }) => {
    const { t } = useTranslation("chat");
    return (
        <div className="fixed bottom-4 left-0 right-0 ml-auto mr-auto w-full px-2 sm:absolute sm:bottom-8 sm:left-[280px] sm:w-1/2 lg:left-[200px]">
            <div className="mb-4 text-center text-red-500">
                {t("Sorry, there was an error.")}
            </div>
            <button
                className="flex h-12 gap-2 w-full items-center justify-center rounded-lg border border-b-gray-300 bg-gray-100 text-sm font-semibold text-gray-500 dark:border-none dark:bg-gray-700 dark:text-gray-200"
                onClick={onRegenerate}
            >
                <IconRefresh />
                <div>{t("Regenerate response")}</div>
            </button>
        </div>
    );
};
