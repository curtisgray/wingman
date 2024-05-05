import { GetWingmanControlServerUrl, WingmanLogItem } from "@/types/wingman";

interface UtilsActionProps
{
    requestWriteToLog: (logItem: WingmanLogItem) => Promise<boolean>;
}

export function useRequestUtilsAction(): UtilsActionProps
{
    const requestWriteToLog = async (logItem: WingmanLogItem): Promise<boolean> =>
    {
        try {
            const body = JSON.stringify(logItem);
            const url = `${GetWingmanControlServerUrl()}/api/utils/log`;
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
