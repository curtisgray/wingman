import { AIModel, AIModelID, DownloadableItem, VendorInfo, Vendors } from "@/types/ai";
import { timeAgo } from "@/types/download";
import { precisionRound } from "@/types/wingman";
import { IconBrandOpenai, IconBrandMeta, IconUnlink, IconApi, IconPlaneOff, IconPlaneTilt, IconPropeller, IconAperture } from "@tabler/icons-react";
import { ReactNode } from "react";
import { Tooltip } from "react-tooltip";

export const WINGMAN_DEFAULT_ICON_SIZE = 18;
export const WINGMAN_OFFLINE_MESSAGE = "Connecting to Wingman service...";

export const isModelDownloadable = (model: AIModel) =>
{
    return Vendors[model.vendor].isDownloadable;
};

export const largestInferableItem = (items: DownloadableItem[] | undefined) =>
{
    const inferableItems = items?.filter(item => item.isInferable) || [];

    const inferableItem = inferableItems.length > 0
        ? inferableItems.reduce((prev, current) => (prev.normalizedQuantizedMemRequired > current.normalizedQuantizedMemRequired) ? prev : current)
        : undefined;

    return inferableItem;
}

export const largestInferableModelItem = (model: AIModel) =>
{
    return largestInferableItem(model.items);
}

export const displayVendorIcon = (vendor: VendorInfo, iconSize: number = WINGMAN_DEFAULT_ICON_SIZE) =>
{
    switch (vendor.name) {
        case "openai":
            return <div className="dark:text-gray-50 text-gray-800"><IconBrandOpenai size={iconSize} /></div>;
        case "meta":
            return <div className="text-blue-600"><IconBrandMeta size={iconSize} /></div>;
        default:
            return <IconUnlink className="" size={iconSize} />;
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
        return <div className="flex"><span>{cleanName}</span></div>;
    } else {
        return <div className="flex"><span>{model.name}</span></div>;
    }
};

export const displayCleanModelName = (modelName: string) =>
{
    // split the repo owner and name and return 'name (repo owner)'
    const [owner, repo] = modelName.split('/');
    const cleanName = repo.replace(/-/g, ' ');
    return <div className="flex"><span>{cleanName}</span></div>;
};

export const displayModelInfo = (model: AIModel | undefined) =>
{
    if (!model) return <></>;
    const vendor = Vendors[model.vendor];
    if (vendor.isDownloadable) {
        return (
            <div className='flex space-x-1'>
                {displayClearedForTakeoff(model)}
                {displayModelName(model)}
            </div>
        );
    } else {
        return <span>{model.name}</span>;
    }
};

export const displayAIMemoryInfo = (model: AIModel, item: DownloadableItem | undefined = undefined) =>
{
    if (model.availableMemory === 0) return <></>;
    let availableMemory = model.availableMemory;
    // recalculate available memory if the model is different from the inferring model by
    //    adding the memory required by the inferring model
    //  1. Get the inferring model
    //  2. Get the memory required by the inferring model
    //  3. Add the memory required by the inferring model to the available memory
    const formatMemoryRequired = (memory: number): string =>
    {
        const value = memory / 1024;
        // Check if the value is an integer
        if (Math.floor(value) === value) {
            // If it's an integer, show without decimal places
            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        } else {
            // Otherwise, show with one decimal place
            return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        }
    };

    let inferableItem = largestInferableItem(model.items);
    if (item) {
        inferableItem = item;
    }

    let memoryRequired = model.normalizedQuantizedMemRequired;
    if (inferableItem) {
        memoryRequired = inferableItem.normalizedQuantizedMemRequired;
    }
    const memoryAvailable = availableMemory;
    const memoryDelta = (model.normalizedQuantizedMemRequired - availableMemory);

    const memoryRequiredText = formatMemoryRequired(memoryRequired);
    const memoryAvailableText = formatMemoryRequired(memoryAvailable);
    const memoryDeltaText = formatMemoryRequired(memoryDelta);
    const tooltipText = `${memoryRequiredText} GB of memory is required to run this model, ${model.isInferable ? 'and ' : 'but only '}${memoryAvailableText} GB is available. ${model.isInferable ? 'Model is ready to run.' : 'Model does not have enough memory to run.'}`;
    const memoryFootprintText = `${model.isInferable ? `${memoryRequiredText} GB AI may run` : `${memoryRequiredText} GB AI is too big`}`;
    // calculate the percentage of memory required for the progress bar
    const progress = Math.round((model.normalizedQuantizedMemRequired / availableMemory) * 100);
    const isInferable = model.isInferable;
    // const isInferable = model.normalizedQuantizedMemRequired <= availableMemory;
    if (isInferable) {
        return <div className="flex flex-col w-36 cursor-default justify-center items-center text-xs space-y-1 text-gray-950"
            data-tooltip-id="memory-status"
            data-tooltip-content={`${tooltipText}`}>
            <progress
                value={progress}
                max="100"
                className={`flex w-16 h-2 rounded [&::-webkit-progress-bar]:rounded [&::-webkit-progress-value]:rounded [&::-webkit-progress-value]:bg-green-800 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500`}
            ></progress>
            <Tooltip id="memory-status" />
            <p>{memoryFootprintText}</p>
        </div>;
    } else {
        return <div className="flex flex-col w-36 cursor-default justify-center items-center space-y-1 text-xs text-gray-950"
            data-tooltip-id="memory-status"
            data-tooltip-content={`${tooltipText}`}>
            <progress
                value={progress}
                max="100"
                className={`flex w-16 h-2 rounded [&::-webkit-progress-bar]:rounded [&::-webkit-progress-value]:rounded [&::-webkit-progress-value]:bg-red-800 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500`}
            ></progress>
            <p>{memoryFootprintText}</p>
            <Tooltip id="memory-status" />
        </div>;
    }
};

export const displayClearedForTakeoff = (model: AIModel, className = "", showMemoryInfo = true, showItem = false) =>
{
    if (Vendors[model.vendor].isDownloadable) {
        let memoryInfoView = <></>;
        if (showMemoryInfo) {
            memoryInfoView = displayAIMemoryInfo(model, showItem ? model?.item: undefined);
        }
        if (model.isInferable) {
            return <div className={`${className} text-sky-400 flex space-x-2 items-center`}>
                {memoryInfoView}
                <IconPlaneTilt size={WINGMAN_DEFAULT_ICON_SIZE} data-tooltip-id="is-inferable" data-tooltip-content="This AI should run well on your PC" />
                <Tooltip id="is-inferable" />
            </div>;
        } else {
            return <div className={`${className} text-gray-400 flex space-x-2`}>
                {memoryInfoView}
                <IconPlaneOff size={WINGMAN_DEFAULT_ICON_SIZE} data-tooltip-id="is-not-inferable" data-tooltip-content="This AI is unlikely to run well on your PC" />
                <Tooltip id="is-not-inferable" />
            </div>;
        }
    } else {
        return <div className={`${className} text-green-800`}>
            <IconApi size={WINGMAN_DEFAULT_ICON_SIZE} data-tooltip-id="is-api-inferred" data-tooltip-content="API AI will run well on your PC" />
            <Tooltip id="is-api-inferred" />
        </div>;
    }
};

export const displayQuantClearedForTakeoffText = (item: DownloadableItem, className = undefined) =>
{
    if (item.isInferable) {
        return "✅";
    } else {
        return "❌";
    }
};

export const displayDownloadInferringButton = (label: ReactNode, showPropeller: boolean = true) =>
{
    return <div className="flex items-center">
        {showPropeller && <IconPropeller className="w-8 animate-spin" size={10} data-tooltip-id="is-inflight" data-tooltip-content="AI is active" />}
        <span className="w-8/12" >{label}</span>
    </div>;
};

export const displayWaitButton = () =>
{
    return <div className="self-center m-4">
        <div className="w-36 bg-yellow-950 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded">
            <div className="flex space-x-1 items-center justify-center">
                <IconAperture className="animate-spin" size={10} />
                <span>Please wait...</span>
            </div>
        </div>
    </div>;
};

export const displayErrorButton = (label: string) =>
{
    return <div className="self-center m-4">
        <button type="button"
            className="w-36 bg-yellow-500 disabled:shadow-none disabled:cursor-not-allowed text-white py-2 rounded"
            disabled
        >
            {label}
        </button>
    </div>;
};

export const displayModelMetrics = (item: AIModel, className: string = '') =>
{
    const vendor = Vendors[item.vendor];
    if (isModelDownloadable(item)) {
        return <div className={`${className}`}>
            <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-gray-400'>
                {/* <li>{new Date(item.updated).toLocaleDateString()}</li> */}
                <li>{timeAgo(new Date(item.updated))}</li>
                <li>&middot;</li>
                <li>{item.downloads} downloads</li>
                <li>&middot;</li>
                <li>{item.likes} likes</li>
                {item.iQScore > 0 && <><li>&middot;</li><li><span className="">{precisionRound(item.iQScore, 1)}</span> <span className="">IQ</span></li></>}
                {item.eQScore > 0 && <><li>&middot;</li><li><span className="">{precisionRound(item.eQScore, 1)}</span> <span className="">EQ</span></li></>}
            </ul>
        </div>;
    } else {
        const tokenInKb = Math.round(item.tokenLimit / 1024);
        return <div className={`${className}`}>
            <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-gray-400'>
                <li>{vendor.displayName}</li>
                <li>&middot;</li>
                <li>context size {`${tokenInKb}K`}</li>
            </ul>
        </div>;
    }
};


export const displayFullModelInfo = (item: AIModel, className: string = '') =>
{
    const vendor = Vendors[item.vendor];
    if (isModelDownloadable(item)) {
        return <div className={`${className}`}>
            <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-gray-400'>
                {/* <li>{new Date(item.updated).toLocaleDateString()}</li> */}
                <li>{timeAgo(new Date(item.updated))}</li>
                <li>&middot;</li>
                <li>{item.downloads} downloads</li>
                <li>&middot;</li>
                <li>{item.likes} likes</li>
                {item.iQScore > 0 && <><li>&middot;</li><li><span className="">{precisionRound(item.iQScore, 1)}</span> <span className="">IQ</span></li></>}
                {item.eQScore > 0 && <><li>&middot;</li><li><span className="">{precisionRound(item.eQScore, 1)}</span> <span className="">EQ</span></li></>}
            </ul>
        </div>;
    } else {
        const tokenInKb = Math.round(item.tokenLimit / 1024);
        return <div className={`${className}`}>
            <ul className='mt-1 flex space-x-1 text-xs font-normal leading-4 dark:text-gray-700 text-gray-400'>
                <li>{vendor.displayName}</li>
                <li>&middot;</li>
                <li>context size {`${tokenInKb}K`}</li>
            </ul>
        </div>;
    }
};

export const displayActivityIndicator = () =>
{
    return <span className="animate-spin align-middle inline-flex">
        <IconPropeller className="animate-pulse align-middle inline-flex h-4 w-4 mx-1 text-orange-300" size={WINGMAN_DEFAULT_ICON_SIZE} />
    </span>;
};

export const displayLoadingMessage = () =>
{
    return <>
        {displayActivityIndicator()}
        <p>Loading AI...</p>
    </>;
};

export const displayLoadingDataMessage = () =>
{
    return <>
        {displayActivityIndicator()}
        <p>Loading data...</p>
    </>;
};
