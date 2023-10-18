/* eslint-disable @typescript-eslint/no-unused-vars */
import "module-alias/register";
import logger from "@/utils/logger.winston";
import * as path from "path";
import * as fs from "fs";
import { ChildProcess, ExecFileException, execFile } from "child_process";
import * as si from "systeminformation";
import { default as orm } from "@/utils/server/orm";
import { WingmanItem, WingmanServer, WingmanServerStatus } from "@/types/wingman";
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

export const initializeServerStatus = async (): Promise<void> =>
{
    const appItemValue = await orm.getAppItemValue(SERVER_NAME, "default");
    if (appItemValue === undefined) {
        await orm.newAppItem(SERVER_NAME);
        const data: WingmanServer = {
            isa: "WingmanServer",
            status: "starting",
            created: Date.now(),
            updated: Date.now()
        };
        await orm.setAppItemValue(SERVER_NAME, "default", JSON.stringify(data));
    }
    // Check for orphaned inference items and clean up
    await orm.resetWingman();
};

export const updateServerStatus = async (status: WingmanServerStatus, wingmanItem?: WingmanItem, error?: string): Promise<void> =>
{
    const appItemValue = await orm.getAppItemValue(SERVER_NAME, "default");
    if (appItemValue !== undefined) {
        const appData = JSON.parse(appItemValue) as WingmanServer;
        appData.status = status;
        if (error !== undefined) {
            appData.error = error;
        } else {
            delete appData.error;
        }
        appData.updated = Date.now();
        await orm.setAppItemValue(SERVER_NAME, "default", JSON.stringify(appData));
    } else {
        logger.error(`${SERVER_NAME}: (updateServerStatus) appItemValue is undefined`);
    }
};

/*
* --threads N, -t N: Set the number of threads to use during computation.
*  -m FNAME, --model FNAME: Specify the path to the LLaMA model file (e.g., models/7B/ggml-model.gguf).
*  -m ALIAS, --alias ALIAS: Set an alias for the model. The alias will be returned in API responses.
*  -c N, --ctx-size N: Set the size of the prompt context. The default is 512, but LLaMA models were built with a context of 2048, which will provide better results for longer input/inference. The size may differ in other models, for example, baichuan models were build with a context of 4096.
*  -ngl N, --n-gpu-layers N: When compiled with appropriate support (currently CLBlast or cuBLAS), this option allows offloading some layers to the GPU for computation. Generally results in increased performance.
*  -mg i, --main-gpu i: When using multiple GPUs this option controls which GPU is used for small tensors for which the overhead of splitting the computation across all GPUs is not worthwhile. The GPU in question will use slightly more VRAM to store a scratch buffer for temporary results. By default GPU 0 is used. Requires cuBLAS.
*  -ts SPLIT, --tensor-split SPLIT: When using multiple GPUs this option controls how large tensors should be split across all GPUs. SPLIT is a comma-separated list of non-negative values that assigns the proportion of data that each GPU should get in order. For example, "3,2" will assign 60% of the data to GPU 0 and 40% to GPU 1. By default the data is split in proportion to VRAM but this may not be optimal for performance. Requires cuBLAS.
*  -lv, --low-vram: Do not allocate a VRAM scratch buffer for holding temporary results. Reduces VRAM usage at the cost of performance, particularly prompt processing speed. Requires cuBLAS.
*  -b N, --batch-size N: Set the batch size for prompt processing. Default: 512.
* --memory-f32: Use 32-bit floats instead of 16-bit floats for memory key+value. Not recommended.
* --mlock: Lock the model in memory, preventing it from being swapped out when memory-mapped.
* --no-mmap: Do not memory-map the model. By default, models are mapped into memory, which allows the system to load only the necessary parts of the model as needed.
* --numa: Attempt optimizations that help on some NUMA systems.
* --lora FNAME: Apply a LoRA (Low-Rank Adaptation) adapter to the model (implies --no-mmap). This allows you to adapt the pretrained model to specific tasks or domains.
* --lora-base FNAME: Optional model to use as a base for the layers modified by the LoRA adapter. This flag is used in conjunction with the --lora flag, and specifies the base model for the adaptation.
*  -to N, --timeout N: Server read/write timeout in seconds. Default 600.
* --host: Set the hostname or ip address to listen. Default 127.0.0.1.
* --port: Set the port to listen. Default: 8080.
* --path: path from which to serve static files (default examples/server/public)
* --embedding: Enable embedding extraction, Default: disabled.
 *
 */

export const startWingman = async (alias: string | "default", force: boolean = true) =>
{
    logger.silly(`${SERVER_NAME}: (startWingman)...`);
    const modelInfo = await getModelInfo();
    return new Promise<void>((resolve, reject) =>
    {
        logger.silly(`${SERVER_NAME}: main: alias: ${alias}, force: ${force}`);

        // if the alias is already in the map, return an error
        if (childProcesses.has(alias)) {
            if (force) {
                logger.info(`${SERVER_NAME}: (startWingman) Killing existing server with alias: ${alias}`);
                stopWingman(alias);
            } else {
                const errorString = `${SERVER_NAME}: (startWingman) Alias ${alias} already exists`;
                logger.error(errorString);
                reject(new Error(errorString));
                return;
            }
        }

        const entryPoint = path.join(EXE_BASE_DIR, modelInfo.platform, "bin", EXE_NAME);
        if (!fs.existsSync(entryPoint)) {
            const errorString = `${SERVER_NAME}: (startWingman) entryPoint does not exist: ${entryPoint}`;
            logger.error(errorString);
            reject(new Error(errorString));
        } else {
            // const llamaPort = await getPort({ port: 6567 });
            // const llamaWebsocketPort = await getPort({ port: 6568 });
            const llamaPort = 6567;
            const llamaWebsocketPort = 6568;
            const command = `${entryPoint}`;
            logger.verbose(`${SERVER_NAME}: (startWingman) Launching server with command: ${command}`);

            const child = execFile(entryPoint, [
                "--port", llamaPort.toString(),
                "--websocket-port", llamaWebsocketPort.toString(),
                "--gpu-layers", modelInfo.numLayers.toString(),
            ], (error: ExecFileException | null, stdout, stderr) =>
            {
                if (error) {
                    const errorString =`${SERVER_NAME}: (startWingman) Error launching server: ${error}`;
                    logger.error(errorString);
                    reject(new Error(errorString));
                    return;
                } else {
                    resolve();
                }
            });

            if (child !== undefined && child.pid != undefined) {
                logger.verbose(`${SERVER_NAME}: (startWingman) Launched server with PID: ${child.pid}`);
                childProcesses.set(alias, child);

                if (child.stdout) {
                    child.stdout.on("data", (data) =>
                    {
                        logger.debug(`${SERVER_NAME}: (startWingman) (data) ${data}`);
                    });
                }

                if (child.stderr) {
                    child.stderr.on("data", (data) =>
                    {
                        logger.debug(`${SERVER_NAME}: (startWingman) [ERROR] ${data}`);
                    });
                }

                child.on("exit", (code) =>
                {
                    const message = `${SERVER_NAME}: (startWingman) exited with code: ${code}`;
                    if (code !== 0) {
                        logger.error(message);
                        reject(new Error(message));
                    } else {
                        logger.info(message);
                        resolve();
                    }
                });

                // monitor the wingman item status for 'cancelled'
                const monitorWingmanItem = async () =>
                {
                    const item = await orm.getWingmanItem(alias);
                    if (item !== undefined && item.status === "cancelling") {
                        logger.info(`${SERVER_NAME}: (startWingman) (monitorWingmanItem) ${alias} cancelling.`);
                        stopWingman(alias);
                        item.status = "cancelled";
                        await orm.updateWingmanItem(item);
                    } else {
                        setTimeout(monitorWingmanItem, 1000);
                    }
                };
                monitorWingmanItem();
            } else {
                const errorString = `${SERVER_NAME}: (startWingman) Failed to launch server with command: ${command}`;
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
        logger.info(`${SERVER_NAME}: (stopWingman) Stopping server with PID: ${child.pid}`);
        child.kill();
        childProcesses.delete(alias);
    }
};
