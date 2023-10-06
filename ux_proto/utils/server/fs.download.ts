import * as fs from "fs";
import * as path from "path";
import { default as logger } from "@/utils/logger.winston";
import { MODELS_DIR, safeDownloadItemName } from "@/types/download";

const SERVER_NAME = "fs.download";
logger.debug(`${SERVER_NAME}: MODELS_DIR: ${MODELS_DIR}`);

fs.promises.mkdir(MODELS_DIR).catch(() => { });  // Ignore error if directory already exists

export const downloadItemFileExists = async (modelRepo: string, filePath: string): Promise<boolean> =>
    new Promise(async (resolve, reject) =>
    {
        try {
            const downloadItemPath = path.join(MODELS_DIR, safeDownloadItemName(modelRepo, filePath));
            logger.debug(`${SERVER_NAME}: (downloadItemFileExists) ${downloadItemPath}`);
            resolve(fs.existsSync(downloadItemPath));
        } catch (error) {
            const errorString = `${SERVER_NAME}: (downloadItemFileExists) ${error}`;
            reject(new Error(errorString));
        }
    });

export const getDownloadItemFilePath = async (modelRepo: string, filePath: string): Promise<string | undefined> =>
    new Promise((resolve, reject) =>
    {
        try {
            const downloadItemPath = path.join(MODELS_DIR, safeDownloadItemName(modelRepo, filePath));
            logger.silly(`${SERVER_NAME}: (getDownloadItemFile) ${downloadItemPath}`);
            resolve(downloadItemPath);
        } catch (error) {
            const errorString = `${SERVER_NAME}: (getDownloadItemFile) ${error}`;
            reject(new Error(errorString));
        }
    });

export const getDownloadItemFilePaths = async (): Promise<string[]> =>
    new Promise((resolve, reject) =>
    {
        fs.readdir(MODELS_DIR, (err, files) =>
        {
            if (err) {
                const errorString = `${SERVER_NAME}: (getDownloadItemFilePaths) ${err}`;
                logger.error(errorString);
                reject(new Error(errorString));
                return;
            }
            logger.silly(`${SERVER_NAME}: (getDownloadItemFilePaths) ${JSON.stringify(files)}`);
            resolve(files);
        });
    });

export const deleteDownloadItemFile = async (modelRepo: string, filePath: string): Promise<void> =>
    new Promise(async (resolve, reject) =>
    {
        try {
            const downloadItemPath = path.join(MODELS_DIR, safeDownloadItemName(modelRepo, filePath));
            logger.debug(`${SERVER_NAME}: (deleteDownloadItemFile) ${downloadItemPath}`);
            if (fs.existsSync(downloadItemPath)) {
                await fs.promises.unlink(downloadItemPath);
                logger.debug(`${SERVER_NAME}: (deleteDownloadItemFile) ${downloadItemPath} deleted`);
            }
            else
                logger.warn(`${SERVER_NAME}: (deleteDownloadItemFile) ${downloadItemPath} does not exist`);
            resolve();
        } catch (error) {
            const errorString = `${SERVER_NAME}: (deleteDownloadItemFile) ${error}`;
            logger.error(errorString);
            reject(new Error(errorString));
        }
    });