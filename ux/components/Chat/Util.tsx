import { AIModel, AIModelID, VendorInfo, Vendors } from "@/types/ai";
import { IconBrandOpenai, IconBrandMeta, IconUnlink, IconApi, IconPlaneOff, IconPlaneTilt, IconPropeller, IconAperture } from "@tabler/icons-react";
import { Tooltip } from "react-tooltip";

export const WINGMAN_DEFAULT_ICON_SIZE = 18;

export const displayVendorIcon = (vendor: VendorInfo, iconSize: number = WINGMAN_DEFAULT_ICON_SIZE) =>
{
    switch (vendor.name) {
        case "openai":
            return <div className="dark:text-gray-50 text-gray-800"><IconBrandOpenai size={iconSize} /></div>;
        case "meta":
            return <div className="text-blue-600"><IconBrandMeta size={iconSize} /></div>;
        default:
            return <IconUnlink size={iconSize} />;
    }
};

export const displayModelVendor = (model: AIModel | undefined, showVendor: boolean = true, showModelName: boolean = true) =>
{
    if (!model || model.id === AIModelID.NO_MODEL_SELECTED) return <></>;
    const vendor = Vendors[model.vendor];
    return (
        <div className="flex space-x-1">
            {displayVendorIcon(vendor, WINGMAN_DEFAULT_ICON_SIZE)}
            {showVendor && <span className="">{vendor.displayName}</span>}
            {showModelName && <span className="">{model.name}</span>}
        </div>
    );
};

export const displayModelName = (model: AIModel) =>
{
    if (Vendors[model.vendor].isDownloadable) {
        // split the repo owner and name and return 'name (repo owner)'
        const [owner, repo] = model.name.split('/');
        const cleanName = repo.replace(/-/g, ' ');
        return <div className="flex space-x-1"><span>{cleanName}</span></div>;
    } else {
        return <div className="flex space-x-1"><span>{model.name}</span></div>;
    }
};

export const displayClearedForTakeoff = (model: AIModel, className = "") =>
{
    if (Vendors[model.vendor].isDownloadable) {
        if (model.isInferable) {
            return <div className={`${className} text-sky-400`}>
                <IconPlaneTilt size={WINGMAN_DEFAULT_ICON_SIZE} data-tooltip-id="is-inferable" data-tooltip-content="Cleared for takeoff" />
                <Tooltip id="is-inferable" />
            </div>;
        } else {
            return <div className={`${className} text-gray-400`}>
                <IconPlaneOff size={WINGMAN_DEFAULT_ICON_SIZE} data-tooltip-id="is-not-inferable" data-tooltip-content="Not cleared for takeoff" />
                <Tooltip id="is-not-inferable" />
            </div>;
        }
    } else {
        return <div className={`${className} text-green-800`}>
            <IconApi size={WINGMAN_DEFAULT_ICON_SIZE} data-tooltip-id="is-api-inferred" data-tooltip-content="Always cleared for takeoff" />
            <Tooltip id="is-api-inferred" />
        </div>;
    }
};

export const displayDownloadInferringButton = (label: string) =>
{
    return <div className="flex space-x-1 items-center justify-center">
        <IconPropeller className="animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="In flight" />
        <span>{label}</span>
    </div>;
};

export const displayWaitButton = () =>
{
    return <div className="self-center m-4">
        <div className="w-24 bg-yellow-950 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded">
            <div className="flex space-x-1 items-center justify-center">
                <IconAperture className="animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="In flight" />
                <span>Wait</span>
            </div>
        </div>
    </div>;
};

export const displayErrorButton = (label: string) =>
{
    return <div className="self-center m-4">
        <button type="button"
            className="w-24 bg-yellow-500 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
            disabled
        >
            {label}
        </button>
    </div>;
};
