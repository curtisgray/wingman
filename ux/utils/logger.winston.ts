const DISABLE_LOGGING = true;
import { BASE_DIR, DATA_DIR } from "@/types/download";
import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const dailyRotateFileOptions = {
    maxFiles: "14d",
    maxSize: "2m",
    createSymlink: true,
};
const loggerOutputPath = path.join(DATA_DIR, "logs");

const logger = winston.createLogger({
    // level: process.env.LOG_LEVEL || 'debug',
    // silent: process.env.NODE_ENV === "test",
    silent: DISABLE_LOGGING,
    transports: [
        new winston.transports.Console({
            level: process.env.LOG_LEVEL ?? "verbose",
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message }) =>
                {
                    return `[${timestamp}] [${level}] ${message}`;
                }),
            ),
        }),
        new winston.transports.File({
            level: "debug",
            filename: path.join(BASE_DIR, "wingman.log"),
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.printf(({ timestamp, level, message }) =>
                {
                    return `[${timestamp}] [${level}] ${message}`;
                }),
            ),
        }),
        new DailyRotateFile(Object.assign(dailyRotateFileOptions, {
            level: "silly",
            dirname: loggerOutputPath,
            symlinkName: "silly.log",
            format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
        })),
        new DailyRotateFile(Object.assign(dailyRotateFileOptions, {
            level: "debug",
            dirname: loggerOutputPath,
            symlinkName: "debug.log",
            format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
        })),
        new DailyRotateFile(Object.assign(dailyRotateFileOptions, {
            level: "verbose",
            dirname: loggerOutputPath,
            symlinkName: "verbose.log",
            format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
        })),
        new DailyRotateFile(Object.assign(dailyRotateFileOptions, {
            level: "http",
            dirname: loggerOutputPath,
            symlinkName: "http.log",
            format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
        })),
    ],
    format: winston.format.combine(winston.format.metadata(), winston.format.timestamp()),
});

export default logger;