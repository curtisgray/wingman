import HomeContext from "@/pages/api/home/home.context";
import { DEFAULT_TEMPERATURE } from "@/utils/app/const";
import { useTranslation } from "next-i18next";
import { FC, useContext, useState } from "react";

interface Props {
    label: string;
    onChangeTemperature: (temperature: number) => void;
}

export const TemperatureSlider: FC<Props> = ({
    label,
    onChangeTemperature,
}) => {
    const {
        state: { conversations },
    } = useContext(HomeContext);
    const lastConversation = conversations[conversations.length - 1];
    const [temperature, setTemperature] = useState(
        lastConversation?.temperature ?? DEFAULT_TEMPERATURE
    );
    const { t } = useTranslation("chat");
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(event.target.value);
        setTemperature(newValue);
        onChangeTemperature(newValue);
    };

    return (
        <div className="flex flex-col">
            <label className="mb-2 text-left text-gray-700 dark:text-gray-400">
                {label}
            </label>
            <span className="text-[12px] text-black/50 dark:text-white/50 text-sm">
                {t(
                    "Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic."
                )}
            </span>
            <span className="mt-2 mb-1 text-center text-gray-900 dark:text-gray-100">
                {temperature.toFixed(1)}
            </span>
            <input
                className="cursor-pointer"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                onChange={handleChange}
            />
            <ul className="mt-2 pb-8 flex justify-between text-gray-900 dark:text-gray-100">
                <li>{t("Precise")}</li>
                <li>{t("Neutral")}</li>
                <li>{t("Creative")}</li>
            </ul>
        </div>
    );
};
