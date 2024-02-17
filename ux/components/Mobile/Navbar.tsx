import { Conversation } from "@/types/chat";
import { IconPlus } from "@tabler/icons-react";
import { FC } from "react";

interface Props {
    selectedConversation: Conversation;
    onNewConversation: () => void;
}

export const Navbar: FC<Props> = ({
    selectedConversation,
    onNewConversation,
}) => {
    return (
        <nav className="flex w-full justify-between bg-gray-800 py-3 px-4">
            <div className="mr-4"></div>

            <div className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedConversation.name}
            </div>

            <IconPlus
                className="cursor-pointer hover:text-gray-400 mr-8"
                onClick={onNewConversation}
            />
        </nav>
    );
};
