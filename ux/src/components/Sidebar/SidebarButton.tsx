import { FC } from "react";

interface Props {
    text: string;
    icon: JSX.Element;
    onClick: () => void;
    disabled?: boolean;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick, disabled }) => {
    return (
        <button
            className={`flex w-full cursor-pointer select-none items-center gap-3 rounded-md py-3 px-3 text-sm leading-3 transition-colors duration-200 hover:bg-gray-500/10"
            ${disabled ? "disabled:cursor-not-allowed" : ""}`}
            onClick={onClick}
            disabled={disabled}
        >
            <div>{icon}</div>
            <span>{text}</span>
        </button>
    );
};
