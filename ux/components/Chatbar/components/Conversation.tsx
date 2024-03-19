import SidebarActionButton from "@/components/Buttons/SidebarActionButton";
// import { ChatSettingsModal } from "@/components/Chat/ChatSettingsModal";
import ChatbarContext from "@/components/Chatbar/Chatbar.context";
// import PromptbarContext from "@/components/Promptbar/PromptBar.context";
import HomeContext from "@/pages/api/home/home.context";
import { Conversation } from "@/types/chat";
import { Prompt } from "@/types/prompt";
import {
    IconAdjustments,
    IconCheck,
    IconCopy,
    IconMessage,
    IconPencil,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import {
    DragEvent,
    KeyboardEvent,
    MouseEventHandler,
    useContext,
    useEffect,
    useState,
} from "react";

interface Props {
    conversation: Conversation;
    // prompts: Prompt[];
}

export const ConversationComponent = ({ conversation}: Props) => {
    const {
        state: { selectedConversation, messageIsStreaming },
        handleSelectConversation,
        handleUpdateConversation,
        handleDuplicateConversation,
    } = useContext(HomeContext);

    // const {
    //     dispatch: promptDispatch,
    //     handleUpdatePrompt,
    // } = useContext(PromptbarContext);

    const { handleDeleteConversation } = useContext(ChatbarContext);

    const [isDeleting, setIsDeleting] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    // const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);

    const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            selectedConversation && handleRename(selectedConversation);
        }
    };

    const handleDragStart = (
        e: DragEvent<HTMLButtonElement>,
        conversation: Conversation
    ) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData(
                "conversation",
                JSON.stringify(conversation)
            );
        }
    };

    const handleOpenChatSettingsModal = () => {
        console.log("Open chat settings modal");
    };

    const handleChatSettingsUpdate = (prompt: Prompt) =>
    {
        // handleUpdatePrompt(prompt);
        // promptDispatch({ field: "searchTerm", value: "" });
    };

    const handleRename = (conversation: Conversation) => {
        if (renameValue.trim().length > 0) {
            handleUpdateConversation(conversation, {
                key: "name",
                value: renameValue,
            });
            setRenameValue("");
            setIsRenaming(false);
        }
    };

    const handleConfirm: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        if (isDeleting) {
            handleDeleteConversation(conversation);
        } else if (isRenaming) {
            handleRename(conversation);
        } else if (isDuplicating) {
            handleDuplicateConversation(conversation);
        }
        setIsDeleting(false);
        setIsRenaming(false);
        setIsDuplicating(false);
    };

    const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        setIsDeleting(false);
        setIsRenaming(false);
        setIsDuplicating(false);
    };

    const handleOpenRenameModal: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        setIsRenaming(true);
        selectedConversation && setRenameValue(selectedConversation.name);
    };

    const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        setIsDeleting(true);
    };

    const handleDuplicateModel: MouseEventHandler<HTMLButtonElement> = (e) => {
        e.stopPropagation();
        setIsDuplicating(true);
    };

    useEffect(() => {
        if (isRenaming) {
            setIsDeleting(false);
        } else if (isDeleting) {
            setIsRenaming(false);
        }
    }, [isRenaming, isDeleting]);

    return (
        <div className="relative flex items-center">
            {isRenaming && selectedConversation?.id === conversation.id ? (
                <div className="flex w-full items-center gap-3 rounded-lg bg-gray-700/90 p-3">
                    <IconMessage size={18} />
                    <input
                        className="mr-12 flex-1 overflow-hidden overflow-ellipsis border-neutral-400 bg-transparent text-left text-xs leading-3 outline-none focus:border-neutral-100"
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={handleEnterDown}
                        autoFocus
                    />
                </div>
            ) : (
                <button
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-sm transition-colors duration-200 hover:bg-gray-300 dark:hover:bg-gray-700
                         ${messageIsStreaming ? "disabled:cursor-not-allowed" : ""}
                         ${selectedConversation?.id === conversation.id
                            ? "bg-gray-300 dark:bg-gray-700"
                            : "bg-gray-100 dark:bg-gray-800"
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                    disabled={messageIsStreaming}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, conversation)}
                >
                    {/* <IconMessage size={18}
                            className={`${
                                selectedConversation?.id === conversation.id
                                    ? "text-gray-700 dark:text-gray-100"
                                    : "text-gray-400 dark:text-gray-400"
                        }`} /> */}
                    <div
                        className={`relative max-h-5 max-w-52 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-all text-left text-xs leading-3 ${
                            selectedConversation?.id === conversation.id
                                ? "pr-12"
                                : "pr-1"
                        }`}
                    >
                        {conversation.name}
                    </div>
                </button>
            )}

            {(isDeleting || isRenaming || isDuplicating) &&
                selectedConversation?.id === conversation.id && (
                    <div className="absolute right-1 z-10 flex">
                        <SidebarActionButton handleClick={handleConfirm}>
                            <IconCheck size={18} />
                        </SidebarActionButton>
                        <SidebarActionButton handleClick={handleCancel}>
                            <IconX size={18} />
                        </SidebarActionButton>
                    </div>
                )}

            {selectedConversation?.id === conversation.id &&
                !isDeleting &&
                !isRenaming &&
                !isDuplicating && (
                    <div className="absolute right-1 z-10 flex">
                        {/* <SidebarActionButton
                            handleClick={handleOpenChatSettingsModal}
                            toolTipText="Edit conversation settings..."
                        >
                            <IconAdjustments size={18} />
                        </SidebarActionButton> */}
                        <SidebarActionButton
                            handleClick={handleDuplicateModel}
                            toolTipText="Duplicate conversation..."
                        >
                            <IconCopy size={18} />
                        </SidebarActionButton>
                        <SidebarActionButton
                            handleClick={handleOpenRenameModal}
                            toolTipText="Rename conversation..."
                        >
                            <IconPencil size={18} />
                        </SidebarActionButton>
                        <SidebarActionButton
                            handleClick={handleOpenDeleteModal}
                            toolTipText="Delete conversation..."
                        >
                            <IconTrash size={18} />
                        </SidebarActionButton>
                    </div>
                )}
        </div>
    );
};
