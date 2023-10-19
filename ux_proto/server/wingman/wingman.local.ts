/* eslint-disable @typescript-eslint/no-unused-vars */
import "module-alias/register";
import logger from "@/utils/logger.winston";
import * as path from "path";
import * as fs from "fs";
import { ChildProcess, ExecFileException, execFile } from "child_process";
import * as si from "systeminformation";
// import getPort from "get-port";

const SERVER_NAME = "wingman.local";

const childProcesses = new Map<string, ChildProcess>();

let PLATFORM_DIR = "";
switch (process.platform) {
    case "win32":
        PLATFORM_DIR = "Windows";
        break;
    case "linux":
        PLATFORM_DIR = "Linux";
        break;
    case "darwin":
        PLATFORM_DIR = "Darwin";
        break;
    default:
        throw new Error(`${SERVER_NAME}: Unsupported platform: ${process.platform}`);
}

let EXE_BASE_DIR = path.join(__dirname, PLATFORM_DIR);
let EXE_EXT = "";
switch (process.platform) {
    case "win32":
        EXE_EXT = ".exe";
        break;
    case "linux":
        EXE_EXT = "";
        break;
    case "darwin":
        EXE_EXT = ".app";
        EXE_BASE_DIR = path.join(EXE_BASE_DIR, "Contents", "MacOS");
        break;
    default:
        throw new Error(`${SERVER_NAME}: Unsupported platform: ${process.platform}`);
}
export const EXE_NAME = `wingman${EXE_EXT}`;
interface ModelRuntimeInfo
{
    platform: string;
    numLayers: number;
}

const getModelInfo = async (): Promise<ModelRuntimeInfo> =>
{
    const avgVramPerLayer = 138.54286193847656;
    const modelInfo: ModelRuntimeInfo = {
        platform: "default",
        numLayers: 99,
    };

    const gpuInfo = await si.graphics();
    const gpuModel = gpuInfo.controllers[0].model;
    const validGpuModels = ["RTX", "GTX"];
    let gpuMemory = 0;
    if (gpuInfo.controllers[0].vram !== null) gpuMemory = gpuInfo.controllers[0].vram;
    const gpuVendor = gpuInfo.controllers[0].vendor;

    if (gpuVendor.toUpperCase() === "NVIDIA" &&
        validGpuModels.some(model => gpuModel.toUpperCase().includes(model)) &&
        gpuMemory > 1024) {
        modelInfo.platform = "cuBLAS";
    }
    else {
        modelInfo.platform = "Native";
    }
    if (gpuMemory > 1024) {
        modelInfo.numLayers = Math.round(gpuMemory / avgVramPerLayer);
    } else {
        modelInfo.numLayers = 0;
    }

    return modelInfo;
};

export const startWingman = async (alias: string | "default", force: boolean = true) =>
{
    logger.silly(`${SERVER_NAME}::startWingman...`);
    const modelInfo = await getModelInfo();
    return new Promise<void>((resolve, reject) =>
    {
        logger.silly(`${SERVER_NAME}: main: alias: ${alias}, force: ${force}`);

        // if the alias is already in the map, return an error
        if (childProcesses.has(alias)) {
            if (force) {
                logger.info(`${SERVER_NAME}::startWingman Killing existing server with alias: ${alias}`);
                stopWingman(alias);
            } else {
                const errorString = `${SERVER_NAME}::startWingman Alias ${alias} already exists`;
                logger.error(errorString);
                reject(new Error(errorString));
                return;
            }
        }

        const entryPoint = path.join(EXE_BASE_DIR, modelInfo.platform, "bin", EXE_NAME);
        if (!fs.existsSync(entryPoint)) {
            const errorString = `${SERVER_NAME}::startWingman entryPoint does not exist: ${entryPoint}`;
            logger.error(errorString);
            reject(new Error(errorString));
        } else {
            // const llamaPort = await getPort({ port: 6567 });
            // const llamaWebsocketPort = await getPort({ port: 6568 });
            const llamaPort = 6567;
            const llamaWebsocketPort = 6568;
            const command = `${entryPoint}`;
            logger.verbose(`${SERVER_NAME}::startWingman Launching server with command: ${command}`);

            const child = execFile(entryPoint, [
                "--port", llamaPort.toString(),
                "--websocket-port", llamaWebsocketPort.toString(),
                "--gpu-layers", modelInfo.numLayers.toString(),
            ], (error: ExecFileException | null, stdout, stderr) =>
            {
                if (error) {
                    const errorString =`${SERVER_NAME}::startWingman Error launching server: ${error}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                    return;
                } else {
                    resolve();
                }
            });

            if (child !== undefined && child.pid != undefined) {
                logger.verbose(`${SERVER_NAME}::startWingman Launched server with PID: ${child.pid}`);
                childProcesses.set(alias, child);

                if (child.stdout) {
                    child.stdout.on("data", (data) =>
                    {
                        logger.debug(`${SERVER_NAME}::startWingman[stdout] ${data}`);
                    });
                }

                if (child.stderr) {
                    child.stderr.on("data", (data) =>
                    {
                        logger.debug(`${SERVER_NAME}::startWingman[stderr] ${data}`);
                    });
                }

                child.on("exit", (code) =>
                {
                    const message = `${SERVER_NAME}::startWingman[exit] with code: ${code}`;
                    if (code !== 0) {
                        logger.error(message);
                        reject(new Error(message));
                    } else {
                        logger.info(message);
                        resolve();
                    }
                });
            } else {
                const errorString = `${SERVER_NAME}::startWingman Failed to launch server with command: ${command}`;
                logger.error(errorString);
                reject(new Error(errorString));
            }
        }
    });
};

export const stopWingman = async (alias: string | "default") =>
{
    const child = childProcesses.get(alias);
    if (child !== undefined) {
        logger.info(`${SERVER_NAME}::stopWingman Stopping server with PID: ${child.pid}`);
        child.kill();
        childProcesses.delete(alias);
    }
};
