export type WingmanServerStatus = "ready" | "starting" | "preparing" | "running" | "stopping" | "stopped" | "error" | "unknown";
export type WingmanServer = {
    isa: "WingmanServer";
    status: WingmanServerStatus;
    currentWingman?: WingmanItem;
    error?: string;
    created: number;
    updated: number;
};
export type WingmanItemStatus = "idle" | "queued" | "inferring" | "complete" | "error" | "cancelling" | "cancelled";
export type WingmanProps = {
    alias: string;
};
export type WingmanItem = WingmanProps & {
    isa: "WingmanItem";
    status: WingmanItemStatus;
    modelRepo: string;
    filePath: string;
    force: boolean;
    error?: string;
    created: number;
    updated: number;
};
export const createWingmanItem = (alias: string, modelRepo:string, filePath: string, force: boolean = false): WingmanItem =>
{
    return {
        alias: alias,
        modelRepo: modelRepo,
        filePath: filePath,
        force: force,
        status: "idle",
        created: Date.now(),
        updated: Date.now()
    } as WingmanItem;
};
export type WingmanContent = {
    // isa: "WingmanContent";
    content: string;
    model: string;
    stop: boolean;
    timestamp: number;
    completion_probabilities?: [
        {
            content: string;
            probs: [
                {
                    prob: number;
                    tok_str:string;
                }
            ];
        }
    ];
};
export const isValidWingmanItem = (item: WingmanItem) => item.alias !== undefined && item.alias.trim() !== "";
export const WINGMAN_TABLE = "wingman";
