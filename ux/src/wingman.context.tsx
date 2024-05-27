import { Dispatch, createContext } from "react";
import { ActionType } from "@/hooks/useCreateReducer";
import { WingmanConfig, WingmanStateProps } from "@/types/wingman";
// export const WINGMAN_SERVER_DEFAULT_HOST = "127.0.0.1";
// // export const WINGMAN_SERVER_DEFAULT_HOST = "136.38.105.217";
// // export const WINGMAN_SERVER_DEFAULT_HOST = "192.168.0.55";
// export const WINGMAN_INFERENCE_PORT = 6567;
// export const WINGMAN_CONTROL_PORT = 6568;   // both http and websocket is handled by this port
// // export const WINGMAN_INFERENCE_PORT = 40049;
// // export const WINGMAN_CONTROL_PORT = 40189;   // both http and websocket is handled by this port
// // export const WINGMAN_CONTROL_SERVER_URL = `http://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_CONTROL_PORT}`;
// // export const WINGMAN_INFERENCE_SERVER_URL = `http://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_INFERENCE_PORT}`;

// export const GetWingmanControlServerUrl = () => `http://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_CONTROL_PORT}`;
// export const GetWingmanInferenceServerUrl = () => `http://${WINGMAN_SERVER_DEFAULT_HOST}:${WINGMAN_INFERENCE_PORT}`;

export interface WingmanContextProps
{
    state: WingmanStateProps;
    dispatch: Dispatch<ActionType<WingmanStateProps>>;
    handleUpdateWingmanStatusMessage: (statusMessage: string) => void;
    handleUpdateWingmanConfig: (config: WingmanConfig) => void;
}

const WingmanContext = createContext<WingmanContextProps>(undefined!);

export default WingmanContext;
