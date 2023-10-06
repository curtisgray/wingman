import { Dispatch, createContext } from "react";
import { HomeInitialState } from "./home.state";
import { ActionType } from "@/hooks/useCreateReducer";
import { Conversation } from "@/types/chat";
import { KeyValuePair } from "@/types/data";

export interface HomeContextProps
{
    state: HomeInitialState;
    dispatch: Dispatch<ActionType<HomeInitialState>>;
    handleUpdateConversation: (
        conversation: Conversation,
        data: KeyValuePair
    ) => void;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
