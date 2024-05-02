import React, { FC } from 'react';
import { DownloadableItem } from '@/types/ai';
import DownloadableItemCard from './DownloadableItemCard';

interface Props
{
    items: DownloadableItem[];
    className?: string;
}

export const DownloadableItemsList: FC<Props> = ({ items, className='' }) =>
{
    return (
        <div className={`${className} overflow-y-scroll`}>
            {items.map(item => (
                <DownloadableItemCard key={item.filePath} item={item} />
            ))}
        </div>
    );
};

export default DownloadableItemsList;