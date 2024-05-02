import React, { FC } from 'react';
import { DownloadableItem } from '@/types/ai';

interface Props
{
    item: DownloadableItem;
    className?: string;
}

export const DownloadableItemCard: FC<Props> = ({ item, className = '' }) =>
{
    return (
        <div className={`${className}`}>
            <div className="flex space-x-2 justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">{item.modelRepoName}</h3>
                    <p>{item.quantizationName}</p>
                    {/* <p>Downloads: {item.downloads}</p> */}
                </div>
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => console.log('Downloading', item.filePath)}
                    disabled={!item.available || item.isDownloaded}
                >
                    Download now
                </button>
            </div>
        </div>
    );
};

export default DownloadableItemCard;