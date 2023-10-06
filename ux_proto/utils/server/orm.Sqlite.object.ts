import { DownloadItem, createDownloadItem, DATABASE_FILENAME, DOWNLOADS_TABLE, isValidDownloadItem, APP_TABLE, createAppItem, isValidAppItem, AppItem, DATA_DIR, safeDownloadItemName, DownloadedFileInfo, getDownloadItemFilePath, MODELS_DIR, safeDownloadItemNameToModelRepo } from "@/types/download";
import * as fs from "fs";
import * as path from "path";
import * as sqlite from "sqlite3";
import { default as logger } from "@/utils/logger.winston";
import { WINGMAN_TABLE, WingmanItem, createWingmanItem, isValidWingmanItem } from "@/types/wingman";

export class SqliteOrm
{
    SERVER_NAME = "orm.Sqlite.object";
    db: sqlite.Database = undefined as unknown as sqlite.Database;
    initialized = false;
    constructor ()
    {
        logger.debug(`${this.SERVER_NAME}: (constructor) Constructing...`);
    }

    isInitialized(): boolean
    {
        return this.db !== undefined && this.initialized;
    }

    private async openDatabase(dbPath: string): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}: (openDatabase) Opening database ${dbPath}...`);
        if (this.db !== undefined) {
            throw new Error(`${this.SERVER_NAME}: (openDatabase) Database is already opened.`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            this.db = new sqlite.Database(dbPath, (err: Error | undefined | null) =>
            {
                if (err) {
                    const errorString = `${this.SERVER_NAME}: (openDatabase) Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
                logger.debug(`${this.SERVER_NAME}: (openDatabase) Database opened.`);
                // logger.debug(`${this.SERVER_NAME}: (openDatabase) Configuring database...`);
                // this.db.configure("busyTimeout", 3000);
                // logger.silly(`${this.SERVER_NAME}: (openDatabase) Database configured.`);
                resolve();
            });
        });
    }

    private async initializeDatabase(): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}: (initializeDatabase) Initializing database...`);

        if (this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (initializeDatabase) ORM already initialized`);
        }

        logger.debug(`${this.SERVER_NAME}: (initializeDatabase) DATA_DIR: ${DATA_DIR}`);

        // Ensure the directory exists
        logger.debug(`${this.SERVER_NAME}: (initializeDatabase) Ensuring DATA_DIR exists...`);
        await fs.promises.mkdir(DATA_DIR)
            .catch((err) =>
            {
                logger.info(`${this.SERVER_NAME}: (initializeDatabase) Expected Exception: ${err}`);
            });
        logger.silly(`${this.SERVER_NAME}: (initializeDatabase) DATA_DIR exists...`);
        await this.openDatabase(path.join(DATA_DIR, DATABASE_FILENAME));
    }

    private async createDownloadsTable(): Promise<void>
    {
        if (this.db === undefined) {
            throw new Error(`${this.SERVER_NAME}: (createDownloadsTable) Database not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (createDownloadsTable) Creating downloads table...`);
            this.db.run(`CREATE TABLE IF NOT EXISTS ${DOWNLOADS_TABLE} \
                ( \
                    modelRepo TEXT NOT NULL, \
                    filePath TEXT NOT NULL, \
                    status TEXT DEFAULT "idle" NOT NULL, \
                    totalBytes INTEGER DEFAULT 0 NOT NULL, \
                    downloadedBytes INTEGER DEFAULT 0 NOT NULL, \
                    downloadSpeed TEXT, \
                    progress REAL DEFAULT 0.0 NOT NULL, \
                    error TEXT, \
                    created INTEGER DEFAULT 0 NOT NULL, \
                    updated INTEGER DEFAULT 0 NOT NULL, \
                    PRIMARY KEY (modelRepo, filePath) \
                )`,
            (err: Error | undefined | null) =>
            {
                if (err) {
                    const errorString = `${this.SERVER_NAME}: (createDownloadsTable) Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
                logger.debug(`${this.SERVER_NAME}: (createDownloadsTable) Downloads table created.`);
                resolve();
            });
        });
    }

    private async createWingmanTable(): Promise<void>
    {
        if (this.db === undefined) {
            throw new Error(`${this.SERVER_NAME}: (createWingmanTable) Database not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (createWingmanTable) Creating wingman table...`);
            this.db.run(`CREATE TABLE IF NOT EXISTS ${WINGMAN_TABLE} \
                ( \
                    alias TEXT NOT NULL, \
                    status TEXT DEFAULT "idle" NOT NULL, \
                    modelRepo TEXT NOT NULL, \
                    filePath TEXT NOT NULL, \
                    force INTEGER DEFAULT 0 NOT NULL, \
                    error TEXT, \
                    created INTEGER DEFAULT 0 NOT NULL, \
                    updated INTEGER DEFAULT 0 NOT NULL, \
                    PRIMARY KEY (alias) \
                )`,
            (err: Error | undefined | null) =>
            {
                if (err) {
                    const errorString = `${this.SERVER_NAME}: (createWingmanTable) Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
                logger.debug(`${this.SERVER_NAME}: (createWingmanTable) Wingman table created.`);
                resolve();
            });
        });
    }

    private async createAppTable(): Promise<void>
    {
        if (this.db === undefined) {
            throw new Error(`${this.SERVER_NAME}: (createAppTable) Database not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}:(createAppTable) Creating app table...`),
            this.db.run(`CREATE TABLE IF NOT EXISTS ${APP_TABLE} \
                ( \
                    name TEXT NOT NULL, \
                    key TEXT NOT NULL, \
                    value TEXT, \
                    enabled INTEGER DEFAULT 1 NOT NULL, \
                    created INTEGER DEFAULT 0 NOT NULL, \
                    updated INTEGER DEFAULT 0 NOT NULL, \
                    PRIMARY KEY (name, key) \
                )`,
            (err) =>
            {
                if (err) {
                    const errorString = `${this.SERVER_NAME}: (createAppTable) Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
                logger.debug(`${this.SERVER_NAME}: (createAppTable) App table created.`);
                resolve();
            });
        });
    }

    async initialize(): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}: (initializeOrm) Initializing ORM...`);
        await this.initializeDatabase();
        await this.createDownloadsTable();
        await this.createWingmanTable();
        await this.createAppTable();
        this.initialized = true;
    }

    async newAppItem(name: string, key: string = "default"): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (newAppItem) ORM not initialized`);
        }
        const appItem = createAppItem(name, key);
        await this.insertAppItem(appItem);
    }

    async deleteAppItem(name: string, key: string): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (deleteAppItem) ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (deleteAppItem) Deleting app item: ${name}: ${key}`);
            this.db.run(`DELETE FROM ${APP_TABLE} WHERE name = ? and key = ?`, [name, key],
                (err) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (deleteAppItem) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    logger.verbose(`${this.SERVER_NAME}: (deleteAppItem) App deleted.`);
                    resolve();
                });
        });
    }

    async insertAppItem(item: AppItem): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (insertAppItem) ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (updateAppItem) Updating app: ${JSON.stringify(item)}`);
            if (!isValidAppItem(item)) {
                const errorString = `${this.SERVER_NAME}: Invalid app item: ${JSON.stringify(item)}`;
                logger.error(errorString);
                reject(new Error(errorString));
            } else {
                item.updated = Date.now();
                this.db.run(`INSERT OR REPLACE INTO ${APP_TABLE} (name, key, value, created, updated) VALUES (?, ?, ?, ?, ?)`,
                    [item.name, item.key, item.value, item.created, item.updated], (err) =>
                    {
                        if (err) {
                            const errorString = `${this.SERVER_NAME}: (updateAppItem) Exception: ${err}`;
                            logger.error(errorString);
                            reject(new Error(errorString));
                        }
                        logger.debug(`${this.SERVER_NAME}: (updateAppItem) app item updated.`);
                        resolve();
                    });
            }
        });
    }

    async getAppItemValue(name: string, key: string): Promise<string | undefined>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (getAppItemValue) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            // logger.debug(`${this.SERVER_NAME}: (getAppItemValue) Getting app value: ${name}, ${key}`);
            this.db.get<AppItem>(`SELECT * FROM ${APP_TABLE} WHERE name = ? AND key = ?`, [name, key],
                (err: Error | null, row: AppItem | undefined) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (getAppItemValue) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    // logger.debug(`${this.SERVER_NAME}: (getAppItemValue) App value retrieved: ${JSON.stringify(row)}.`);
                    resolve(row?.value);
                });
        });
    }

    async setAppItemValue(name: string, key: string, value: string)
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (setAppItemValue) ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            // logger.debug(`${this.SERVER_NAME}: (setAppItemValue) Setting app value: ${name}, ${key}, ${value}`);
            this.db.run(`UPDATE ${APP_TABLE} SET value = ? WHERE name = ? AND key = ?`, [value, name, key],
                (err) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (setAppItemValue) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    // logger.debug(`${this.SERVER_NAME}: (setAppItemValue) App value set.`);
                    resolve();
                });
        });
    }

    // Utility function to get the filename for a specific modelRepo and filePath
    getDownloadItemFileName(modelRepo: string, filePath: string): string
    {
        return safeDownloadItemName(modelRepo, filePath);
    }

    // Utility function to check if a specific modelRepo and filePath is already downloaded
    async isDownloaded(modelRepo: string, filePath: string): Promise<boolean>
    {
        const destination = getDownloadItemFilePath(modelRepo, filePath);
        return fs.existsSync(destination);
    }

    // Utility function to get downloaded file data
    async getDownloadedFileInfo(modelRepo: string, filePath: string): Promise<DownloadedFileInfo | undefined>
    {
        const item = await this.getDownloadItem(modelRepo, filePath);
        const destination = getDownloadItemFilePath(modelRepo, filePath);
        if (fs.existsSync(destination)) {
            const stats = await fs.promises.stat(destination);
            const dfi = {
                modelRepo: modelRepo,
                filePath: filePath,
                status: item?.status ?? "unknown",
                totalBytes: item?.totalBytes ?? 0,
                downloadedBytes: item?.downloadedBytes ?? 0,
                fileNameOnDisk: path.basename(destination),
                fileSizeOnDisk: stats.size,
                filePathOnDisk: destination,
                created: stats.birthtimeMs,
                updated: stats.mtimeMs
            } as DownloadedFileInfo;
            logger.silly(`${this.SERVER_NAME}: (getDownloadedFileInfo) ${JSON.stringify(dfi)}`);
            return dfi;
        } else {
            logger.silly(`${this.SERVER_NAME}: (getDownloadedFileInfo) ${modelRepo}/${filePath} not downloaded`);
            return undefined;
        }
    }

    async getModelFiles(): Promise<string[]>
    {
        const result: string[] = [];
        const items = await fs.promises.readdir(MODELS_DIR);
        items.forEach(async item =>
        {
            const ls = await fs.promises.lstat(path.join(MODELS_DIR, item));
            if (!ls.isDirectory()) {
                result.push(item);
            }
        });
        return result;
    }

    async getDownloadedFileInfos(): Promise<DownloadedFileInfo[]>
    {
        const result: DownloadedFileInfo[] = [];
        const items = await fs.promises.readdir(MODELS_DIR);
        items.forEach(async item =>
        {
            const ls = await fs.promises.lstat(path.join(MODELS_DIR, item));
            if (!ls.isDirectory()) {
                const downloadItemName = safeDownloadItemNameToModelRepo(item);
                if (downloadItemName) {
                    const dfi = await this.getDownloadedFileInfo(downloadItemName.modelRepo, downloadItemName.filePath);
                    if (dfi) {
                        result.push(dfi);
                    }
                }
            }
        });
        return result;
    }

    async insertNewDownloadItem(modelRepo: string, filePath: string): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}: (newDownloadItem) Creating download item file: ${modelRepo}/${filePath}`);
        await this.updateDownloadItem(createDownloadItem(modelRepo, filePath));
    }

    async deleteDownloadItem(modelRepo: string, filePath: string)
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (deleteDownloadItem) ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) => 
        {
            logger.debug(`${this.SERVER_NAME}: (deleteDownloadItem) Deleting download item ${modelRepo}/${filePath}`);
            this.db.run(`DELETE FROM ${DOWNLOADS_TABLE} WHERE modelRepo = ? AND filePath = ?`, [modelRepo, filePath],
                (err: Error | undefined | null) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (deleteDownloadItem) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    logger.debug(`${this.SERVER_NAME}: (deleteDownloadItem) ${modelRepo}/${filePath} deleted.`);
                    resolve();
                });
        });
    }

    // Update the download table to set all 'downloading' items to 'queued'. Used at startup.
    async resetDownloads(): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (resetDownloads) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (resetDownloadItem) Resetting all download progress...`);
            this.db.run(`UPDATE ${DOWNLOADS_TABLE} SET status = 'queued', progress = 0, downloadedBytes = 0, totalBytes = 0, downloadSpeed = '' WHERE status = 'downloading'`,
                (err: Error | undefined | null) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (resetDownloadItem) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    logger.debug(`${this.SERVER_NAME}: (resetDownloadItem) all download items reset.`);
                    resolve();
                });
        });
    }

    async updateDownloadItem(item: DownloadItem)
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (updateDownloadItem) ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (updateDownloadItem) Updating download item: ${JSON.stringify(item)}`);
            if (!isValidDownloadItem(item)) {
                logger.error(`${this.SERVER_NAME}: Invalid download item: ${JSON.stringify(item)}`);
            } else {

                item.updated = Date.now();

                try {
                    this.db.run(`INSERT OR REPLACE INTO ${DOWNLOADS_TABLE} \
            (modelRepo, filePath, status, totalBytes, downloadedBytes, downloadSpeed, progress, error, created, updated) \
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.modelRepo, item.filePath, item.status,
                        item.totalBytes, item.downloadedBytes, item.downloadSpeed, item.progress,
                        item.error, item.created, item.updated],
                    (err: Error | undefined | null) =>
                    {
                        if (err) {
                            const errorString = `${this.SERVER_NAME}: (updateDownloadItem) Exception: ${err}`;
                            logger.error(errorString);
                            reject(new Error(errorString));
                        }
                        logger.debug(`${this.SERVER_NAME}: (updateDownloadItem) item updated.`);
                        resolve();
                    });
                } catch (err) {
                    const errorString = `${this.SERVER_NAME}: (updateDownloadItem) Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
            }
        });
    }

    async getDownloadItem(modelRepo: string, filePath: string): Promise<DownloadItem | undefined>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (getDownloadItem) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (getDownloadItem) Getting download item for ${modelRepo}/${filePath}`);
            this.db.get<DownloadItem>(`SELECT * FROM ${DOWNLOADS_TABLE} WHERE modelRepo = ? AND filePath = ?`, [modelRepo, filePath],
                (err: Error | null, row: DownloadItem | undefined) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (getDownloadItem) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    } else {
                        logger.debug(`${this.SERVER_NAME}: (getDownloadItem) download item retrieved: ${row}`);
                        resolve(row);
                    }
                });
        });
    }

    async getDownloadItems(): Promise<DownloadItem[]>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (getDownloadItems) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            // logger.debug(`${this.SERVER_NAME}: (getDownloadItems) Getting all download items.`);
            const downloadItems: DownloadItem[] = [];

            this.db.all<DownloadItem>(`SELECT * FROM ${DOWNLOADS_TABLE} ORDER BY updated`,
                (err: Error | null, rows: DownloadItem[] | undefined) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (getDownloadItems) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    if (rows && rows.length > 0)
                        rows.forEach(row => downloadItems.push(row));
                    // logger.debug(`${this.SERVER_NAME}: (getDownloadItems) ${downloadItems.length} download items retrieved.`);
                    resolve(downloadItems);
                });
        });
    }

    async getNextDownloadItem(): Promise<DownloadItem | undefined>
    {
        const allDownloadItems = await this.getDownloadItems();
        const nextItem = allDownloadItems?.filter(p => p.status === "queued" || p.status === "downloading");
        if (nextItem.length === 0) {
            return undefined;
        } else {
            return nextItem[0];
        }
    }

    async insertNewWingmanItem(alias: string, modelRepo: string, filePath: string, force: boolean = false): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}: (newWingmanItem) Creating wingman item file: ${alias}`);
        await this.updateWingmanItem(createWingmanItem(alias, modelRepo, filePath, force));
    }

    async deleteWingmanItem(alias: string): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (deleteWingmanItem) ORM not initialized`);
        }
        return new Promise((resolve, reject) => 
        {
            logger.debug(`${this.SERVER_NAME}: (deleteWingmanItem) Deleting wingman item ${alias}`);
            this.db.run(`DELETE FROM ${WINGMAN_TABLE} WHERE alias = ? `, [alias],
                (err: Error | undefined | null) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (deleteWingmanItem) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    logger.debug(`${this.SERVER_NAME}: (deleteWingmanItem) ${alias} deleted.`);
                    resolve();
                });
        });
    }

    // Update the wingman table to clear all items. Used at startup.
    async resetWingman(): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (resetWingman) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (resetWingman) Resetting all download progress...`);
            this.db.run(`DELETE FROM ${WINGMAN_TABLE}`,
                (err: Error | undefined | null) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (resetWingman) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    logger.debug(`${this.SERVER_NAME}: (resetWingman) all wingman items removed.`);
                    resolve();
                });
        });
    }

    async updateWingmanItem(item: WingmanItem): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (updateWingmanItem) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (updateWingmanItem) Updating wingman item: ${JSON.stringify(item)}`);
            if (!isValidWingmanItem(item)) {
                logger.error(`${this.SERVER_NAME}: Invalid wingman item: ${JSON.stringify(item)}`);
            } else {

                item.updated = Date.now();

                try {
                    this.db.run(`INSERT OR REPLACE INTO ${WINGMAN_TABLE} (alias, status, modelRepo, filePath, force, error, created, updated) \
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.alias, item.status, item.modelRepo, item.filePath, item.force,
                        item.error, item.created, item.updated],
                    (err: Error | undefined | null) =>
                    {
                        if (err) {
                            const errorString = `${this.SERVER_NAME}: (updateWingmanItem) Exception: ${err}`;
                            logger.error(errorString);
                            reject(new Error(errorString));
                        }
                        logger.debug(`${this.SERVER_NAME}: (updateWingmanItem) item updated.`);
                        resolve();
                    });
                } catch (err) {
                    const errorString = `${this.SERVER_NAME}: (updateWingmanItem) Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
            }
        });
    }

    async getWingmanItem(alias: string): Promise<WingmanItem | undefined>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (getWingmanItem) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}: (getWingmanItem) Getting download item for ${alias}`);
            this.db.get<WingmanItem>(`SELECT * FROM ${WINGMAN_TABLE} WHERE alias = ?`, [alias],
                (err: Error | null, row: WingmanItem | undefined) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (getWingmanItem) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    } else {
                        logger.debug(`${this.SERVER_NAME}: (getWingmanItem) download item retrieved: ${JSON.stringify(row)}`);
                        resolve(row);
                    }
                });
        });
    }

    async getWingmanItems(): Promise<WingmanItem[]>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}: (getWingmanItems) ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            // logger.debug(`${this.SERVER_NAME}: (getWingmanItems) Getting all wingman items.`);
            const wingmanItems: WingmanItem[] = [];

            this.db.all<WingmanItem>(`SELECT * FROM ${WINGMAN_TABLE} ORDER BY updated`,
                (err: Error | null, rows: WingmanItem[] | undefined) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}: (getWingmanItems) Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    if (rows && rows.length > 0)
                        rows.forEach(row => wingmanItems.push(row));
                    // logger.debug(`${this.SERVER_NAME}: (getWingmanItems) ${wingmanItems.length} wingman items retrieved.`);
                    resolve(wingmanItems);
                });
        });
    }

    async getNextWingmanItem(): Promise<WingmanItem | undefined>
    {
        const allWingmanItems = await this.getWingmanItems();
        const nextItem = allWingmanItems?.filter(p => p.status === "queued");
        if (nextItem.length === 0) {
            return undefined;
        } else {
            return nextItem[0];
        }
    }
}

const orm = new SqliteOrm();

export default orm;