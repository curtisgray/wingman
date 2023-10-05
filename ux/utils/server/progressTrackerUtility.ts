import fs from 'fs';
import path from 'path';

const progressDirectory = path.join(process.cwd(), 'progressTracker');

if (!fs.existsSync(progressDirectory)) {
    fs.mkdirSync(progressDirectory);
}

const getProgressFilePath = (modelRepo: string, filePath: string) => {
    const filename = `${modelRepo}-${filePath}.json`.replace(/[^a-z0-9]/gi, '_');
    return path.join(progressDirectory, filename);
};

export const updateProgress = (modelRepo: string, filePath: string, data: any) => {
    fs.writeFileSync(getProgressFilePath(modelRepo, filePath), JSON.stringify(data));
};

export const getProgress = (modelRepo: string, filePath: string) => {
    return JSON.parse(fs.readFileSync(getProgressFilePath(modelRepo, filePath), 'utf-8'));
};

export const getAllProgress = () => {
    const files = fs.readdirSync(progressDirectory);
    return files.map(file => JSON.parse(fs.readFileSync(path.join(progressDirectory, file), 'utf-8')));
};
