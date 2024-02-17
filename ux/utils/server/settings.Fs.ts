import { DATA_DIR } from '@/types/download';
import * as fs from 'fs';
import * as path from 'path';
const SETTINGS_FILENAME = 'settings.json';

class SettingsStorage
{
    private filePath: string;

    constructor ()
    {
        this.filePath = path.join(DATA_DIR, SETTINGS_FILENAME);
        this.ensureFileExists();
    }

    private ensureFileExists(): void
    {
        try {
            // Check if the data directory exists, create it if it doesn't
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            // Check if the settings file exists, create it if it doesn't
            fs.accessSync(this.filePath, fs.constants.F_OK);
        } catch (e) {
            fs.writeFileSync(this.filePath, JSON.stringify({}));
        }
    }

    private readSettings(): Record<string, any>
    {
        const data = fs.readFileSync(this.filePath, { encoding: 'utf8' });
        try {
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Error parsing settings file.');
        }
    }

    private writeSettings(data: Record<string, any>): void
    {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    }

    public getItem(key: string): string | null
    {
        const data = this.readSettings();
        return data[key] || null;
    }

    public setItem(key: string, value: any): void
    {
        const data = this.readSettings();
        data[key] = value;
        this.writeSettings(data);
    }

    public removeItem(key: string): void
    {
        const data = this.readSettings();
        delete data[key];
        this.writeSettings(data);
    }
}


const orm = new SettingsStorage();

export default orm;
// // Example usage
// const settings = new SettingsStorage();
// settings.setItem('testKey', 'testValue');
// console.log(settings.getItem('testKey')); // Should log 'testValue'
// settings.removeItem('testKey');
// console.log(settings.getItem('testKey')); // Should log 'null'
