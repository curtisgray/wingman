import path from "path";
import os from "os";

export const DATABASE_FILENAME = "wingman.db";
export const DOWNLOADS_TABLE = "downloads";
export const APP_TABLE = "app";
export const BASE_DIR = path.join(os.homedir(), ".wingman");
export const DATA_DIR = path.join(BASE_DIR, "data");
export const MODELS_DIR = path.join(DATA_DIR, "models");
