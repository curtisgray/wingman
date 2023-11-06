export type WingmanServerAppItemStatus = "ready" | "starting" | "preparing" | "running" | "stopping" | "stopped" | "error" | "unknown";
export type WingmanServerAppItem = {
    isa: "WingmanServerAppItem";
    status: WingmanServerAppItemStatus;
    alias: string;
    modelRepo: string;
    filePath: string;
    error?: string;
    created: number;
    updated: number;
};
export type WingmanItemStatus = "queued" | "preparing" | "inferring" | "complete" | "error" | "cancelling" | "cancelled" | "unknown";
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
        isa: "WingmanItem",
        alias: alias,
        modelRepo: modelRepo,
        filePath: filePath,
        force: force,
        status: "unknown",
        created: Date.now(),
        updated: Date.now()
    } as WingmanItem;
};
export type WingmanContent = {
    isa: "WingmanContent";
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
