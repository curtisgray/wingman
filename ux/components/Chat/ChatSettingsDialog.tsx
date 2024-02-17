import { useCreateReducer } from "@/hooks/useCreateReducer";
import HomeContext from "@/pages/api/home/home.context";
import { Settings } from "@/types/settings";
import { getSettings, saveSettings } from "@/utils/app/settings";
import { useTranslation } from "next-i18next";
import { FC, useContext, useEffect, useReducer, useRef } from "react";
import ChatSettings from "./ChatSettings";

interface Props {
    open: boolean;
    onClose: () => void;
}

export const ChatSettingsDialog: FC<Props> = ({ open, onClose }) => {
    const { t } = useTranslation("chat"); // TODO: Change to appropriate namespace when translations are added
    // const settings: Settings = getSettings();
    // const { state, dispatch } = useCreateReducer<Settings>({
    //     initialState: settings,
    // });
    const {
        state: {
            selectedConversation,
            models,
            prompts        },
        handleUpdateConversation,
    } = useContext(HomeContext);

    const modalRef = useRef<HTMLDivElement>(null);

    const handleChangeSystemPrompt = (prompt: string) =>
    {
        if (selectedConversation) {
            handleUpdateConversation(selectedConversation, {
                key: "systemPrompt",
                value: prompt,
            });
        }
    };

    const handleChangeTemperature = (temperature: number) =>
    {
        if (selectedConversation) {
            handleUpdateConversation(
                selectedConversation,
                {
                    key: "temperature",
                    value: temperature,
                }
            );
        }
    };

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(e.target as Node)
            ) {
                window.addEventListener("mouseup", handleMouseUp);
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener("mouseup", handleMouseUp);
            onClose();
        };

        window.addEventListener("mousedown", handleMouseDown);

        return () => {
            window.removeEventListener("mousedown", handleMouseDown);
        };
    }, [onClose]);

    const handleSave = () => {
        // homeDispatch({ field: "lightMode", value: state.theme });
        // saveSettings(state);
    };

    // Render nothing if the dialog is not open.
    if (!open) {
        return <></>;
    }

    // Render the dialog.
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="fixed inset-0 z-10 overflow-hidden">
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div
                        className="hidden sm:inline-block sm:h-screen sm:align-middle"
                        aria-hidden="true"
                    />

                    <div
                        ref={modalRef}
                        className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-neutral-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-neutral-900 sm:my-8 sm:max-h-[700px] sm:w-full sm:max-w-fit sm:p-6 sm:align-middle"
                        role="dialog"
                    >
                        <ChatSettings models={models} conversation={selectedConversation!} prompts={prompts} onChangeSystemPrompt={handleChangeSystemPrompt} onChangeTemperature={handleChangeTemperature} />

                        <button
                            type="button"
                            className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
                            onClick={() => {
                                handleSave();
                                onClose();
                            }}
                        >
                            {t("Close")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
