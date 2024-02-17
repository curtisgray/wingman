import { SidebarButton } from "../Sidebar/SidebarButton";
import { IconCheck, IconKey, IconX } from "@tabler/icons-react";
import { useTranslation } from "next-i18next";
import { FC, KeyboardEvent, useEffect, useRef, useState } from "react";

interface SettingInputProps {
    value: string;
    onChange: (value: string) => void;
    hideInput: boolean;
    labelText: string;
}

export const SettingInput: FC<SettingInputProps> = ({ value, labelText = "", onChange = () => {}, hideInput = false }) => {
    const { t } = useTranslation("sidebar");
    const [isChanging, setIsChanging] = useState(false);
    const [newValue, setNewValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleUpdateKey(newValue);
        }
    };

    const handleUpdateKey = (newValue: string) => {
        onChange(newValue.trim());
        setIsChanging(false);
    };

    useEffect(() => {
        if (isChanging) {
            inputRef.current?.focus();
        }
    }, [isChanging]);

    return isChanging ? (
        <div className="duration:200 flex w-full cursor-pointer items-center rounded-md py-3 px-3 transition-colors hover:bg-gray-500/10">
            <IconKey size={18} />

            <input
                ref={inputRef}
                className="ml-2 h-[20px] flex-1 overflow-hidden overflow-ellipsis border-b border-gray-400 bg-transparent pr-1 text-xs leading-3 text-left text-white outline-none focus:border-gray-100"
                type={`${hideInput ? "password" : "text"}`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleEnterDown}
                // placeholder={t("API Key") || "API Key"}
            />

            <div className="flex w-[40px]">
                <IconCheck
                    className="ml-auto min-w-[20px] text-gray-400 hover:text-gray-100"
                    size={18}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateKey(newValue);
                    }}
                />

                <IconX
                    className="ml-auto min-w-[20px] text-gray-400 hover:text-gray-100"
                    size={18}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsChanging(false);
                        setNewValue(value);
                    }}
                />
            </div>
        </div>
    ) : (
        <SidebarButton
            text={labelText}
            icon={<IconKey size={18} />}
            onClick={() => setIsChanging(true)}
        />
    );
};
