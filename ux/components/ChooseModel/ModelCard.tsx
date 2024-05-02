import { AIModel } from '@/types/ai';
import React, { FC } from 'react';
import { displayModelName } from '../Chat/Util';
import { prettyBytes } from '@/types/download';

interface Props
{
    model: AIModel | undefined;
    className?: string;
}

export const ModelCard: FC<Props> = ({ model, className = '' }) =>
{
    return model ? (
        <div className={`${className} flex flex-col space-y-1 p-4`}>
            <h2 className="text-xl font-bold">{displayModelName(model)}</h2>
            <p className="text-xs">{model.id}</p>
            <p>Model Size: {model.size}</p>
            <p>Token Limit: {prettyBytes(model.tokenLimit, 0)}</p>
            <p>Full Size Memory Required: {prettyBytes(model.normalizedQuantizedMemRequired * 1024 * 1024)} (Available: {prettyBytes(model.availableMemory * 1024 * 1024)})</p>
            <p>Created: {new Date(model.created).toLocaleDateString()}</p>
            <p>Updated: {new Date(model.updated).toLocaleDateString()}</p>
            <p>Downloads: {model.downloads} | Likes: {model.likes}</p>
        </div>
    ) : <></>;
};
