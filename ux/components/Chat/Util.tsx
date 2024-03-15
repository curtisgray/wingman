import { AIModel, AIModelID, VendorInfo, Vendors } from "@/types/ai";
import { IconBrandOpenai, IconBrandMeta, IconRobot, IconUnlink } from "@tabler/icons-react";

export const WINGMAN_DEFAULT_ICON_SIZE = 18;

export const displayVendorIcon = (vendor: VendorInfo, iconSize: number = WINGMAN_DEFAULT_ICON_SIZE) =>
{
    switch (vendor.name) {
        case "openai":
            return <div className="dark:text-gray-50 text-gray-800"><IconBrandOpenai size={iconSize} /></div>;
        case "meta":
            return <div className="text-blue-600"><IconBrandMeta size={iconSize} /></div>
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
        // return <div className="flex space-x-1"><span>{repo}</span><span className="text-xs">{owner}</span></div>;
        return <div className="flex space-x-1"><span>{cleanName}</span></div>;
    } else {
        return <div className="flex space-x-1"><span>{model.name}</span></div>;
    }
};
