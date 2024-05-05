import { FC, useEffect, useRef } from "react";
import { MarkdownView } from "./MarkdownView";
import { IconX } from "@tabler/icons-react";

interface Props
{
    open: boolean;
    onClose: () => void;
}

export const WingmanReleaseNotesDialog: FC<Props> = ({ open, onClose }) =>
{
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        const handleMouseDown = (e: MouseEvent) =>
        {
            if (
                modalRef.current &&
                !modalRef.current.contains(e.target as Node)
            ) {
                window.addEventListener("mouseup", handleMouseUp);
            }
        };

        const handleMouseUp = () =>
        {
            window.removeEventListener("mouseup", handleMouseUp);
            onClose();
        };

        window.addEventListener("mousedown", handleMouseDown);

        return () =>
        {
            window.removeEventListener("mousedown", handleMouseDown);
        };
    }, [onClose]);

    // Render nothing if the dialog is not open.
    if (!open) {
        return <></>;
    }

    // Render the dialog.
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="fixed inset-0 z-10 overflow-hidden">
                <div className="flex items-center justify-center relative min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div
                        className="hidden sm:inline-block sm:h-screen sm:align-middle"
                        aria-hidden="true"
                    />

                    <div
                        ref={modalRef}
                        className="dark:border-gray-400 inline-block max-h-[400px] transform overflow-y-auto rounded border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-gray-900 sm:my-8 sm:max-h-[700px] sm:w-full sm:max-w-fit sm:p-6 sm:align-middle"
                        role="dialog">
                        <MarkdownView fileName="release-notes.md" />
                        <button className="absolute top-0 right-0 mt-4 mr-4 text-gray-500 hover:text-gray-900 focus:outline-none dark:text-gray-400 dark:hover:text-gray-100" onClick={onClose}>
                            <IconX size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
