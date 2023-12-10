import { Dispatch, createContext } from "react";
import { ActionType } from "@/hooks/useCreateReducer";
import { WingmanStateProps } from "@/types/wingman";

export interface WingmanContextProps
{
    state: WingmanStateProps;
    dispatch: Dispatch<ActionType<WingmanStateProps>>;
    handleStartGenerating: (prompt: string, probabilties_to_return: number) => Promise<void>;
    handleStopGenerating: () => void;
    handleToggleMetrics: () => void;
}

const WingmanContext = createContext<WingmanContextProps>(undefined!);

export default WingmanContext;
