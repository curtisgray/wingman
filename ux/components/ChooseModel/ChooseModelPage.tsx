import { FC, useContext } from "react";
import ModelSearchView from "./ModelSearchView";
import SelectedConversationModelStatus from "../Chat/SelectedConversationModelStatus";

interface Props
{
    onClose: () => void;
}

export const ChooseModelPage: FC<Props> = ({ onClose }) =>
{
    return (
        <div className="flex flex-col w-full bg-gray-100 dark:bg-gray-800">
            <div className="flex w-full justify-center dark:bg-gray-600 rounded-t p-1">
                <SelectedConversationModelStatus showQuantization={false} />
            </div>
            <ModelSearchView onSelect={() => onClose()} className="m-8" />
            <div className="flex justify-center">
                <button
                    onClick={() => onClose()}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 rounded hover:bg-gray-700 dark:hover:bg-gray-600">
                    Return to Chat
                </button>
            </div>
        </div>
    );
};
