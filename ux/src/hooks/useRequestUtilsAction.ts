import { WingmanConfig, WingmanLogItem } from "@/types/wingman";

interface UtilsActionProps
{
    requestWriteToLog: (logItem: WingmanLogItem) => Promise<boolean>;
}

export function useRequestUtilsAction(config: WingmanConfig): UtilsActionProps
{
    const requestWriteToLog = async (logItem: WingmanLogItem): Promise<boolean> =>
    {
        try {
            const body = JSON.stringify(logItem);
            const url = `http://${config.serverHost}:${config.controlPort}/api/utils/log`;
            // post message to log as json
            const response = await fetch(url, {
                method: "POST",
                body: body
            });

            if (response.ok) {
                return true;
            }
        } catch (error) {
            console.error("useRequestUtilsAction: utilsPostAction Failed to post log:", error);
        }
        return false;
    };

    return {
        requestWriteToLog
    };
}
