import { Dispatch, createContext } from "react";
import { ActionType } from "@/hooks/useCreateReducer";
import { WingmanInitialState } from "./wingman.state";

export interface WingmanContextProps
{
    state: WingmanInitialState;
    dispatch: Dispatch<ActionType<WingmanInitialState>>;
}

const WingmanContext = createContext<WingmanContextProps>(undefined!);

export default WingmanContext;
