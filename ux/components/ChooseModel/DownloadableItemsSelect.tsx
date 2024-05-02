import { DownloadableItem } from '@/types/ai';
import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { displayQuantClearedForTakeoffText } from '../Chat/Util';
import WingmanContext from '@/pages/api/home/wingman.context';

interface Props
{
    items: DownloadableItem[];
    defaultItem?: DownloadableItem;
    onSelect?: (item: DownloadableItem) => void; // Callback function when an item is selected
    className?: string;
}

export const DownloadableItemSelect: FC<Props> = ({ items, defaultItem = undefined, onSelect = undefined, className = undefined }) =>
{
    const [selectedItem, setSelectedItem] = useState<DownloadableItem | undefined>(defaultItem);
    const [itemsChanged, setItemsChanged] = useState(false);

    const {
        state: { downloadItems },
    } = useContext(WingmanContext);

    const displayOption = useCallback((item: DownloadableItem) =>
    {
        // if item is in downloadItems, show "Downloaded" in the option
        if (downloadItems.find(di => di.filePath === item.filePath))
            return `${displayQuantClearedForTakeoffText(item)} - ${item.quantizationName} (Downloaded)`;
        if (defaultItem && item.filePath === defaultItem.filePath)
            return `${displayQuantClearedForTakeoffText(item)} - ${item.quantizationName} (Recommended)`;
        return `${displayQuantClearedForTakeoffText(item)} - ${item.quantizationName}`;
    }, [defaultItem, downloadItems]);

    useEffect(() =>
    {
        if (selectedItem)
            onSelect?.(selectedItem);
    }, [selectedItem]);

    useEffect(() =>
    {
        if (itemsChanged)
        {
            if (defaultItem)
                setSelectedItem(defaultItem);
            else
                setSelectedItem(items[0]);
            setItemsChanged(false);
        }
    }, [defaultItem, items, itemsChanged]);

    useEffect(() =>
    {
        setItemsChanged(true);
    }, [items]);

    if (items.length === 0) {
        return <div className={`${className} flex`}>
            <label className="block text-sm font-semibold text-gray-700">No optimizations to choose</label>
        </div>;
    }

    return (
        <div className={`${className} flex`}>
            <label className="block text-sm font-semibold text-gray-700">Choose an optimization</label>
            <select
                className="block w-full p-2 border border-gray-300 rounded shadow-sm"
                value={selectedItem?.filePath}
                onChange={e =>
                {
                    const si = items.find(item => item.filePath === e.target.value);
                    if (si) {
                        setSelectedItem(si);
                    }
                }}
            >
                <option value="" disabled>Select the optimization</option>
                {items.map((item, index) => (
                    <option key={index} value={items[index].filePath}>
                        {displayOption(item)}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default DownloadableItemSelect;
