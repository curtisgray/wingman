import { DATABASE_FILENAME, APP_TABLE, createAppItem, isValidAppItem, AppItem, DATA_DIR } from "@/types/download";
import * as path from "path";
import * as sqlite from "sqlite3";
import { default as logger } from "@/utils/logger.winston";

export class SettingsSqlite
{
    SERVER_NAME = "settings.Sqlite.object";
    db: sqlite.Database = undefined as unknown as sqlite.Database;
    initialized = false;
    constructor ()
    {
        logger.debug(`${this.SERVER_NAME}::constructor Constructing...`);
    }

    isInitialized(): boolean
    {
        return this.db !== undefined && this.initialized;
    }

    private async openDatabase(dbPath: string): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}::openDatabase Opening database ${dbPath}...`);
        if (this.db !== undefined) {
            throw new Error(`${this.SERVER_NAME}::openDatabase Database is already opened.`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            this.db = new sqlite.Database(dbPath, (err: Error | undefined | null) =>
            {
                if (err) {
                    const errorString = `${this.SERVER_NAME}::openDatabase Exception: ${err}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                }
                logger.debug(`${this.SERVER_NAME}::openDatabase Database opened.`);
                resolve();
            });
        });
    }

    private async initializeDatabase(): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}::initializeDatabase Initializing database...`);

        if (this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::initializeDatabase ORM already initialized`);
        }

        logger.debug(`${this.SERVER_NAME}::initializeDatabase DATA_DIR: ${DATA_DIR}`);

        await this.openDatabase(path.join(DATA_DIR, DATABASE_FILENAME));
    }

    async initialize(): Promise<void>
    {
        logger.debug(`${this.SERVER_NAME}::initialize Initializing ORM...`);
        await this.initializeDatabase();
        this.initialized = true;
    }

    async getItem(key: string): Promise<string | undefined>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::getItem ORM not initialized`);
        }
        const name = `settings_${key}`;
        return this.getAppItemValue(name, key);
    }

    async setItem(key: string, value: string): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::setItem ORM not initialized`);
        }
        const name = `settings_${key}`;
        await this.setAppItemValue(name, key, value);
    }

    async removeItem(key: string): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::deleteItem ORM not initialized`);
        }
        const name = `settings_${key}`;
        await this.deleteAppItem(name, key);
    }

    private async deleteAppItem(name: string, key: string): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::deleteAppItem ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}::deleteAppItem Deleting app item: ${name}: ${key}`);
            this.db.run(`DELETE FROM ${APP_TABLE} WHERE name = ? and key = ?`, [name, key],
                (err) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}::deleteAppItem Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    logger.verbose(`${this.SERVER_NAME}::deleteAppItem App deleted.`);
                    resolve();
                });
        });
    }

    private async insertAppItem(item: AppItem): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::insertAppItem ORM not initialized`);
        }
        return new Promise<void>((resolve, reject) =>
        {
            logger.debug(`${this.SERVER_NAME}::updateAppItem Updating app: ${JSON.stringify(item)}`);
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
                            const errorString = `${this.SERVER_NAME}::updateAppItem Exception: ${err}`;
                            logger.error(errorString);
                            reject(new Error(errorString));
                        }
                        logger.debug(`${this.SERVER_NAME}::updateAppItem app item updated.`);
                        resolve();
                    });
            }
        });
    }

    private async getAppItemValue(name: string, key: string): Promise<string | undefined>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::getAppItemValue ORM not initialized`);
        }
        return new Promise((resolve, reject) =>
        {
            this.db.get<AppItem>(`SELECT * FROM ${APP_TABLE} WHERE name = ? AND key = ?`, [name, key],
                (err: Error | null, row: AppItem | undefined) =>
                {
                    if (err) {
                        const errorString = `${this.SERVER_NAME}::getAppItemValue Exception: ${err}`;
                        logger.error(errorString);
                        reject(new Error(errorString));
                    }
                    resolve(row?.value);
                });
        });
    }

    private async setAppItemValue(name: string, key: string, value: string): Promise<void>
    {
        if (!this.isInitialized()) {
            throw new Error(`${this.SERVER_NAME}::setAppItemValue ORM not initialized`);
        }
        const appItem = createAppItem(name, key);
        appItem.value = value;
        await this.insertAppItem(appItem);
    }
}

const orm = new SettingsSqlite();

export default orm;