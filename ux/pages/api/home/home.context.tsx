import { AIModel } from "@/types/ai";
import { HomeStateProps } from "./home.state";
import { ActionType } from "@/hooks/useCreateReducer";
import { Conversation } from "@/types/chat";
import { KeyValuePair } from "@/types/data";
import { FolderType } from "@/types/folder";
import { Dispatch, createContext } from "react";

export interface HomeContextProps {
    state: HomeStateProps;
    dispatch: Dispatch<ActionType<HomeStateProps>>;
    handleNewConversation: () => void;
    handleCreateFolder: (name: string, type: FolderType) => void;
    handleDeleteFolder: (folderId: string) => void;
    handleUpdateFolder: (folderId: string, name: string) => void;
    handleSelectConversation: (conversation: Conversation) => void;
    handleUpdateConversation: (
        conversation: Conversation,
        data: KeyValuePair
    ) => void;
    handleDuplicateConversation: (conversation: Conversation) => void;
    handleDeleteConversation: (conversation: Conversation) => void;
    handleChangeModel: (model: AIModel | undefined) => void;
    handleSyncModel: (model: AIModel | undefined) => void;
    handleRefreshModels: () => void;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
