import { Dispatch, createContext } from "react";
import { ActionType } from "@/hooks/useCreateReducer";
import { WingmanStateProps } from "@/types/wingman";

export interface WingmanContextProps
{
    state: WingmanStateProps;
    dispatch: Dispatch<ActionType<WingmanStateProps>>;
}

const WingmanContext = createContext<WingmanContextProps>(undefined!);

export default WingmanContext;
