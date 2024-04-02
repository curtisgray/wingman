const DISABLE_LOGGING = false;
const { app, BrowserWindow } = require("electron");
let APP_WINDOW = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock)
{
    app.quit();
} else
{
    // run this as early in the main process as possible
    if (require("electron-squirrel-startup")) app.quit();
    const { updateElectronApp } = require('update-electron-app');

    updateElectronApp(); // additional configuration options available

    const child_process = require("node:child_process");
    const path = require("path");
    const fs = require("fs");
    const os = require("os");
    const { ipcMain } = require("electron");
    const winston = require("winston");
    const net = require("net");
    const si = require('systeminformation');
    const url = require('url');
    const { createMenu } = require('./menu');

    const APP_DIR = path.join(os.homedir(), ".wingman");
    let LOGGER_WINDOW = null;
    // set WINGMAN_UI_PORT to -1 to use a random port
    let WINGMAN_UI_PORT = 49152;
    const WINGMAN_KILL_FILE_NAME = "wingman.die";
    const WINGMAN_EXIT_FILE_NAME = "wingman.exit";
    const WINGMAN_EXIT_MESSAGES = [
        "***Wingman Exit***",
        "***Wingman Error Exit***"
    ];
    const WINGMAN_SERVICE_PROCESS_MAP = new Map();

    const logger = winston.createLogger({
        level: "silly",
        silent: DISABLE_LOGGING,
        format: winston.format.printf(({ level, message, label, timestamp }) =>
        {
            const ts = timestamp ? timestamp : new Date().toISOString();
            return `[${ts}] [${level}] ${message}`;
        }),
        defaultMeta: { service: "wingman-electron" },
        transports: [
            new winston.transports.File({
                filename: path.join(APP_DIR, "wingman.log"),
                level: "silly",
            }),
        ],
    });

    const findOpenPortWithProgressAndCancel = () =>
    {
        let cancelRequested = false;
        const ports = Array.from(
            { length: 65535 - 49152 + 1 },
            (_, i) => 49152 + i
        ); // Dynamic/private range

        const cancel = () =>
        {
            cancelRequested = true;
        };

        const checkPort = (port, progressCallback) =>
        {
            return new Promise((resolve, reject) =>
            {
                if (cancelRequested)
                {
                    reject(new Error("Cancelled"));
                    return;
                }

                const server = net.createServer();
                server.listen(port, () =>
                {
                    server.once("close", () => resolve(port));
                    server.close();
                });
                server.on("error", () => resolve(null));
            });
        };

        const findPort = (progressCallback) =>
        {
            return new Promise(async (resolve) =>
            {
                if (WINGMAN_UI_PORT !== -1)
                {
                    for (let i = 0; i < ports.length; i++)
                    {
                        if (cancelRequested)
                        {
                            resolve(-1); // Cancelled
                            return;
                        }
                        const port = await checkPort(ports[i], progressCallback);
                        if (port !== null)
                        {
                            resolve(port);
                            return;
                        }
                        progressCallback(i + 1, ports.length);
                    }
                    resolve(-1); // No open port found
                } else
                {
                    resolve(WINGMAN_UI_PORT);
                }
            });
        };

        return { findPort, cancel };
    };

    let nextJsServerProcessController = null;

    logger.log("info", "Starting Wingman Electron");
    const tell = (data) =>
    {
        // strip trailing newline
        data = data.replace(/\n$/, "");
        // prepend the current process id
        data = `[${process.pid}] ${data}`;
        logger.log("info", data);
    };

    const dtell = (data) =>
    {
        // strip trailing newline
        data = data.replace(/\n$/, "");
        // prepend the current process id
        data = `[${process.pid}] ${data}`;
        logger.log("debug", data);
    };

    const etell = (data) =>
    {
        // strip trailing newline
        data = data.replace(/\n$/, "");
        // prepend the current process id
        data = `[${process.pid}] ${data}`;
        logger.log("error", data);
    };

    const createKillFile = () =>
    {
        const killFilePath = path.join(APP_DIR, WINGMAN_KILL_FILE_NAME);
        tell(`Creating kill file: ${killFilePath}`);
        fs.writeFileSync(killFilePath, `[${Date.now}] This file is used to signal the Wingman process to terminate.`, { encoding: "utf-8" });
        dtell(`Created kill file: ${killFilePath}`);
        return killFilePath;
    };

    const createExitFile = () =>
    {
        const exitFilePath = path.join(APP_DIR, WINGMAN_EXIT_FILE_NAME);
        tell(`Creating exit file: ${exitFilePath}`);
        fs.writeFileSync(exitFilePath, `[${Date.now}] This file is used to signal the Wingman process to exit cleanly.`, { encoding: "utf-8" });
        dtell(`Created exit file: ${exitFilePath}`);
        return exitFilePath;
    };

    // check if `app.asar` is in the __dirname
    const isPackaged = __dirname.includes('app.asar');

    const getBaseDir = () =>
    {
        let baseDir = path.resolve(path.join(__dirname, '..'));
        if (isPackaged)
        {
            tell(`App is packaged. Using Resources path.`);
            baseDir = path.resolve(process.resourcesPath);

            if (process.platform === 'darwin')
            {
                tell(`App is packaged on ${process.platform}. Using Contents/Resources path`);
                baseDir = path.resolve(path.dirname(path.join(__dirname, '..', '..', 'Resources')));
            }
        }
        return baseDir;
    };

    // const handleWingmanResetAndRestart = async (exeDir, wingmanDir, nextDir, waitForExitFirst = true) =>
    // {
    //     return new Promise(async (resolve) =>
    //     {
    //         try
    //         {
    //             etell('[W] (handleAIModelLoadingError): Terminating Wingman server process...');
    //             // Ensure the termination of the wingman process
    //             if (!wingmanProcessController)
    //             {
    //                 etell(`[W] (handleAIModelLoadingError): Wingman process controller is not available`);
    //                 reject(new Error('Wingman process controller is not available'));
    //                 return;
    //             }
    //             await wingmanProcessController.terminate();
    //             dtell('[W] (handleAIModelLoadingError): Wingman server process terminated.');
    //             // After reset is complete, attempt to restart wingman
    //             dtell(`[W] (handleAIModelLoadingError): Firing 'start-wingman' event...`);
    //             ipcMain.emit("start-wingman", wingmanDir, nextDir);
    //             resolve();
    //         } catch (error)
    //         {
    //             etell(`[W] (handleAIModelLoadingError): Error handling Wingman reset and restart: ${error}`);
    //             reject(error);
    //         }
    //     });
    // };

    const getWingmanExecutableInfo = async (wingmanDir) =>
    {
        return new Promise(async (resolve, reject) =>
        {
            let useCublas = false;
            let executableName = 'wingman';

            const graphics = await si.graphics();
            const gpus = graphics.controllers;
            const hasNvidiaGpu = gpus.some(gpu => gpu.vendor.toLowerCase().includes('nvidia'));
            const hasAmdGpu = gpus.some(gpu => gpu.vendor.toLowerCase().includes('amd'));
            const hasIntelGpu = gpus.some(gpu => gpu.vendor.toLowerCase().includes('intel'));

            if (hasNvidiaGpu)
            {
                useCublas = true;
            }

            if (hasAmdGpu)
            {
            }

            if (hasIntelGpu)
            {
            }

            let wingman_runtime = "";
            switch (process.platform)
            {
                case 'win32':
                    wingman_runtime = useCublas ? 'windows-cublas' : 'windows';
                    executableName += '.exe';
                    break;
                case 'linux':
                    wingman_runtime = useCublas ? 'linux-cublas' : 'linux';
                    break;
                case 'darwin':
                    if (process.arch === 'arm64')
                    {
                        wingman_runtime = 'macos-metal';
                    }
                    else
                    {
                        wingman_runtime = 'macos';
                    }
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${process.platform}`));
                    return;
            }
            tell(`[W] Wingman Runtime: ${wingman_runtime}`);
            const exeDir = path.join(wingmanDir, 'wingman', wingman_runtime, 'bin');
            resolve([exeDir, executableName]);
        });
    };

    const launchWingmanExecutable = async (wingmanDir, nextDir) =>
    {
        return new Promise(async (resolve, reject) =>
        {
            try
            {
                let forceShutdown = false;
                let hasModelLoadingError = false;
                let isServerRestarting = false;
                let executablePath = "";
                let [cwd = exeDir, executableName] = await getWingmanExecutableInfo(wingmanDir);

                tell(`[W] Wingman Base directory: ${wingmanDir}`);
                tell(`[W] Wingman Executable directory: ${cwd}`);
                executablePath = path.resolve(path.join(cwd, executableName));

                tell(`[W] Launching Wingman executable: ${executablePath}`);
                const subprocess = child_process.spawn(executablePath, [], {
                    stdio: ['inherit', 'pipe', 'pipe'],
                    cwd: cwd,
                    windowsHide: true,
                });

                const removeProcessFromMap = (pid) =>
                {
                    if (WINGMAN_SERVICE_PROCESS_MAP.has(`PID_${pid}`))
                    {
                        WINGMAN_SERVICE_PROCESS_MAP.delete(`PID_${pid}`);
                        dtell(`(removeProcessFromMap): WINGMAN_SERVICE_PROCESS_MAP has : ${WINGMAN_SERVICE_PROCESS_MAP.size} entries after removing PID_${pid}`);
                    }
                };

                let isClosingWingman = false;
                const closeWingman = async (force = false) =>
                {
                    return new Promise(async (resolve) =>
                    {
                        if (isClosingWingman)
                        {
                            etell(`[W] (closeWingman): already closing`);
                            // reject(new Error('Already closing'));
                            return;
                        }
                        isClosingWingman = true;
                        if (force)
                        {
                            etell(`[W] (closeWingman): Forcefully closing Wingman process...`);
                            createKillFile();
                        } else
                        {
                            etell(`[W] (closeWingman): Closing Wingman process...`);
                            createExitFile();
                        }
                        subprocess.on('close', () =>
                        {
                            tell(`[W] (terminateWingman): Wingman process closed.`);
                            removeProcessFromMap(subprocess.pid);
                            resolve();
                        });
                    });
                };

                const terminateWingman = async () =>
                {
                    return closeWingman(true);
                };

                const shutdownWingman = async () =>
                {
                    return closeWingman(false);
                };

                const terminateAndRestartWingman = async () =>
                {
                    return new Promise(async (resolve) =>
                    {
                        if (isServerRestarting)
                        {
                            etell(`[W] (terminateAndRestartWingman): already terminating`);
                            // reject(new Error('Already terminating'));
                            return;
                        }
                        isServerRestarting = true;

                        tell(`[W] (terminateAndRestartWingman): Terminating Wingman process...`);
                        await terminateWingman();
                        tell(`[W] (terminateAndRestartWingman): Wingman process terminated.`);
                        tell(`[W] (terminateAndRestartWingman): Emit 'start-wingman'...`);
                        ipcMain.emit("start-wingman", wingmanDir, nextDir);
                        resolve();
                    });
                };

                /**
                 * Handles AI model loading errors and determines if Wingman should be restarted or shutdown.
                 * @param {string} output - The output from the Wingman subprocess.
                 * @returns true if Wingman should be forcefully shutdown, false otherwise.
                 */
                const mustShutdownForModelLoadingError = (output) =>
                {
                    if (!output) { etell(`[W] (mustShutdownForModelLoadingError): output is empty`); return false; }
                    // if (isServerShuttingDown) { etell(`[W] (mustShutdownForModelLoadingError): shutting down ignoring output: ${output}`); return false; }
                    if (hasModelLoadingError || forceShutdown) { etell(`[W] (mustShutdownForModelLoadingError): already has model loading error or force shutdown: ${output}`); return false; }
                    hasModelLoadingError = false;
                    forceShutdown = false;
                    // Loading an AI model failed on Windows:
                    // - `cudaMalloc failed: out of memory`
                    // - `::startInference run_inference returned 1024.`
                    if (output.includes("cudaMalloc failed: out of memory"))
                    {   // this is a fatal error. Wingman will shutdown at once
                        hasModelLoadingError = true;
                        forceShutdown = true;
                    }
                    if (output.includes("::startInference run_inference returned 1024."))
                    {   // this is a fatal error. Wingman will shutdown at once
                        hasModelLoadingError = true;
                        forceShutdown = true;
                    }
                    if (output.includes("terminating due to uncaught exception"))
                    {   // this is a fatal error. from llama.cpp. Wingman will shutdown at once
                        hasModelLoadingError = true;
                        forceShutdown = true;
                    }
                    // Loading an AI model failed on Apple Silicon:
                    // - `ggml_metal_graph_compute: command buffer 0 failed with status 5` (buffer could be any number and status could be any number)
                    // - `ggml_backend_metal_log_allocated_size: warning: current allocated size is greater than the recommended max working set size`

                    // check for buffer followed by any number and status followed by any number
                    const bufferStatusRegex = /ggml_metal_graph_compute: command buffer \d+ failed with status \d+/;
                    if (bufferStatusRegex.test(output))
                    {   // this could be a non-fatal error, but tends to be fatal after awhile. Wingman will have to be forcefully shutdown
                        hasModelLoadingError = true;
                        forceShutdown = true;
                    }

                    if (output.includes("ggml_metal_graph_compute: command buffer 0 failed with status 5"))
                    {  // this is a fatal error. Wingman will have to be forcefully shutdown
                        hasModelLoadingError = true;
                        forceShutdown = true;
                    }

                    if (forceShutdown)
                    {
                        etell(`[W] (mustShutdownForModelLoadingError): Model catastrophic loading error detected: ${output}`);
                    }
                    else if (hasModelLoadingError)
                    {
                        etell(`[W] (mustShutdownForModelLoadingError): Model loading error detected: ${output}`);
                    }
                    return forceShutdown;
                };

                let isServerReady = false;
                subprocess.stdout.on('data', async (data) =>
                {
                    if (!data) { etell(`[W] stdout data is empty`); return; }
                    const output = data.toString();
                    tell(`[W] stdout: ${output}`);

                    // Server is ready: `96ad0fad-82da-43a9-a313-25f51ef90e7c`
                    if (output.includes("96ad0fad-82da-43a9-a313-25f51ef90e7c"))
                    {
                        isServerReady = true;
                        resolve({
                            terminate: terminateWingman,
                            shutdown: shutdownWingman,
                            pid: subprocess.pid,
                        });
                    }

                    if (isServerReady)
                    {
                        if (mustShutdownForModelLoadingError(output) === true)
                        {
                            await terminateAndRestartWingman();
                        }
                    }
                });

                subprocess.stderr.on('data', async (data) =>
                {
                    if (!data) { etell(`[W] stderr: data is empty`); return; }
                    const output = data.toString();
                    if (mustShutdownForModelLoadingError(output) === true)
                    {
                        await terminateAndRestartWingman();
                    } else
                    {
                        if (output === ".")
                        {   // this should be written directly to stderr
                            process.stderr.write(output);
                        }
                        else
                        {
                            etell(`[W] stderr: ${output}`);
                        }
                    }
                });

                subprocess.on('error', (err) =>
                {
                    etell(`[W] error:Failed to start subprocess: ${err}`);
                    reject(err);
                });

                subprocess.on('close', async (code) =>
                {
                    // if code is null, it means the process was killed, or did not exit on its own
                    //   so check if there is a known model error, and otherwise restart the process
                    if (code === null)
                    {
                    }
                    if (code !== 0)
                    {
                        etell(`[W] close: process exited with code ${code}`);
                    }
                    else
                    {
                        tell(`[W] close: process exited with code ${code}`);
                    }
                    removeProcessFromMap(subprocess.pid);
                });

            } catch (error)
            {
                etell(`[W] catch: Error launching Wingman executable: ${error}`);
                reject(error);
            }
        });
    };

    /**
     * Starts the NextJS app in a separate process with specified port and hostname,
     * and waits for the stdout message indicating readiness before resolving.
     * @param {string} scriptPath - The path to the NextJS server script.
     * @param {number} port - The port number for the server.
     * @param {string} [hostName='localhost'] - The hostname for the server.
     * @returns {Promise<{terminate: Function}>} - A promise that resolves to an object containing a terminate function.
     */
    const startNextJsStandaloneServer = (port, scriptPath, hostName = 'localhost') =>
    {
        return new Promise((resolve, reject) =>
        {
            if (!fs.existsSync(scriptPath))
            {
                return reject(new Error(`Script file not found: ${scriptPath}`));
            }

            // Set up environment variables for the child process
            const env = {
                ...process.env,
                NODE_ENV: 'production',
                PORT: port.toString(),
                HOSTNAME: hostName,
            };

            const child = child_process.fork(scriptPath, [], {
                stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
                env,
            });

            child.on('error', (err) =>
            {
                reject(err);
            });

            let isServerReady = false;
            child.stdout.on("data", (data) =>
            {
                const output = data.toString();
                tell(`[UX] stdout: ${output}`);
                // Server is ready: `✓ Ready in`
                if (output.includes("✓ Ready in"))
                {
                    isServerReady = true;
                    resolve({
                        terminate: () =>
                        {
                            tell('Terminating Next.js server...');
                            child.kill('SIGINT'); // Terminate the child process
                            resolve();
                        }
                    });
                }
            });

            child.stderr.on("data", (data) =>
            {
                const errorOutput = data.toString();
                etell(`Server stderr: ${errorOutput}`);
            });
        });
    };

    const createWindow = () =>
    {
        APP_WINDOW = new BrowserWindow({
            width: 1366,
            height: 1080,
            icon: path.resolve(path.join(__dirname, "..", "assets", "logo-color")),
            webPreferences: {
                nodeIntegration: true,
                // contextIsolation: false,
                // enableRemoteModule: true,
                preload: path.join(__dirname, "preload.js"),
            },
            title: "Wingman",
        });

        APP_WINDOW.loadURL(url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }));

        if (!isPackaged)
            APP_WINDOW.webContents.openDevTools();

        const { findPort, cancel } = findOpenPortWithProgressAndCancel();

        findPort((current, total) => tell(`Checked ${current} of ${total} ports.`))
            .then(async (port) =>
            {
                tell(`Found an open port: ${port}`);
                const baseDir = getBaseDir();
                tell(`Base directory: ${baseDir}`);
                let wingmanDir = path.join(baseDir, "server");
                if (isPackaged)
                {
                    wingmanDir = baseDir;
                }
                tell(`Wingman directory: ${wingmanDir}`);
                let nextDir = path.resolve(path.join(baseDir, ".next", "standalone"));
                if (isPackaged)
                {
                    nextDir = path.join(baseDir, "standalone");
                }
                tell(`Next.js directory: ${nextDir}`);
                let [exeDir,] = await getWingmanExecutableInfo(wingmanDir);

                const onShowLogViewer = () =>
                {
                    if (LOGGER_WINDOW)
                    {
                        LOGGER_WINDOW.focus();
                        return;
                    }
                    LOGGER_WINDOW = require('./logViewer').createLogWindow();
                    LOGGER_WINDOW.on("closed", () =>
                    {
                        LOGGER_WINDOW = null;
                    });
                };
                const onRestartWingmanService = async () =>
                {
                    // await handleWingmanResetAndRestart(exeDir, wingmanDir, nextDir, false, false);
                    // if (APP_WINDOW)
                    // {
                    //     // refresh the main window after restarting Wingman
                    //     APP_WINDOW.reload();
                    // }
                };
                createMenu(onShowLogViewer, onRestartWingmanService);

                try
                {
                    ipcMain.emit('start-wingman', wingmanDir, nextDir);
                } catch (error)
                {
                    etell(`Error launching Wingman and Next.js ${error}`);
                }
            })
            .catch((error) =>
            {
                ipcMain.emit('report-error', null, error.toString());
            });

        APP_WINDOW.on("will-navigate", (e) => e.preventDefault());
        APP_WINDOW.on("closed", () =>
        {
            APP_WINDOW = null;
            // close the logger window
            if (LOGGER_WINDOW)
            {
                LOGGER_WINDOW.close();
                LOGGER_WINDOW = null;
            }
        });
    };

    ipcMain.on("report-error", (event, error) =>
    {
        if (!APP_WINDOW)
        {
            etell(`ipcMain::report-error: App window is not available. This is unexpected.`);
            etell(`ipcMain::report-error: Error from renderer: ${error}`);
            return;
        }
        etell(`ipcMain::report-error: ${error}`);
        APP_WINDOW.loadURL(`error.html?error=${encodeURIComponent(error)}`);
    });

    const ensureNoOtherWingmanProcesses = async (force = false) =>
    {
        if (WINGMAN_SERVICE_PROCESS_MAP.size > 0)
        {
            dtell(`(start-wingman): WINGMAN_SERVICE_PROCESS_MAP has : ${WINGMAN_SERVICE_PROCESS_MAP.size} entries before terminating all services`);
            for (const [key, value] of WINGMAN_SERVICE_PROCESS_MAP)
            {
                try
                {
                    if (force)
                    {
                        dtell(`(start-wingman): Terminating Wingman server: ${key}`);
                        await value.terminate();
                    } else
                    {
                        dtell(`(start-wingman): Shutting down Wingman server: ${key}`);
                        await value.shutdown();
                    }
                } catch (error)
                {
                    etell(`(start-wingman): Error terminating Wingman server: ${error}`);
                }
            }
            WINGMAN_SERVICE_PROCESS_MAP.clear();
            dtell(`(start-wingman): WINGMAN_SERVICE_PROCESS_MAP has : ${WINGMAN_SERVICE_PROCESS_MAP.size} entries after terminating all services`);
        } else
        {
            dtell(`(start-wingman): WINGMAN_SERVICE_PROCESS_MAP has : ${WINGMAN_SERVICE_PROCESS_MAP.size} entries. No need to terminate services.`);
        }
    };

    let firstTimeStartingWingman = true;
    ipcMain.on("start-wingman", async (wingmanDir, nextDir) =>
    {
        dtell(`(start-wingman): Starting Wingman services...`);
        ensureNoOtherWingmanProcesses(true);
        launchWingmanExecutable(wingmanDir, nextDir)
            .then((controller) =>
            {
                dtell(`(start-wingman): Wingman services started.`);
                if (firstTimeStartingWingman)
                {
                    WINGMAN_SERVICE_PROCESS_MAP.set(`PID_${controller.pid}`, controller);
                    dtell(`(start-wingman): WINGMAN_SERVICE_PROCESS_MAP has : ${WINGMAN_SERVICE_PROCESS_MAP.size} entries after adding PID_${controller.pid}`);
                    dtell(`(start-wingman): Firing 'start-nextjs' event...`);
                    ipcMain.emit("start-nextjs", WINGMAN_UI_PORT, nextDir);
                    firstTimeStartingWingman = false;
                }
            })
            .catch((error) =>
            {
                etell(`Error starting Wingman: ${error}`);
                ipcMain.emit('report-error', null, `Failed to start Wingman services. Please restart: ${error}`);
            });
    });

    ipcMain.on("start-nextjs", async (port, nextDir) =>
    {
        if (nextJsServerProcessController)
        {
            etell('Next.js server is already running');
            await nextJsServerProcessController.terminate();
        }
        await startNextJsStandaloneServer(port, path.join(nextDir, 'server.js'))
            .then((controller) =>
            {
                nextJsServerProcessController = controller;
                ipcMain.emit('go-to-ux', port);
            })
            .catch((error) => 
            {
                etell(`Error starting Next.js server: ${error}`);
                ipcMain.emit('report-error', null, `Failed to start Next.js server: ${error}`);
            });
    });

    ipcMain.on("go-to-ux", (port) =>
    {
        if (!APP_WINDOW)
        {
            etell(`ipcMain::go-to-ux: App window is not available. This is unexpected.`);
            etell(`ipcMain::go-to-ux: Error from renderer: ${error}`);
            return;
        }
        APP_WINDOW.loadURL(url.format({
            pathname: `localhost:${port}`,
            protocol: 'http:',
            slashes: true
        })).catch((error) =>
        {
            etell(`Error loading URL: ${error}`);
            ipcMain.emit('report-error', null, `Failed to load the app page: ${error}`);
        });
    });

    app.whenReady().then(() =>
    {
        createWindow();

        app.on("activate", () =>
        {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on('second-instance', (event, commandLine, workingDirectory) =>
    {
        // Someone tried to run a second instance, we should focus our window.
        if (APP_WINDOW)
        {
            if (APP_WINDOW.isMinimized()) APP_WINDOW.restore();
            APP_WINDOW.focus();
        }
    });

    let alreadyShuttingDown = false;

    const shutdownApp = async () =>
    {
        if (alreadyShuttingDown) return;
        alreadyShuttingDown = true;

        tell('All windows closed. Cleaning up...');
        // close the logger window
        if (LOGGER_WINDOW)
        {
            LOGGER_WINDOW.close();
            LOGGER_WINDOW = null;
        }

        if (process.platform !== "darwin") app.quit();

        if (nextJsServerProcessController)
        {
            try
            {
                await nextJsServerProcessController.terminate();
            } catch (error)
            {
                etell(`Error terminating Next.js server: ${error}`);
            }
        }
        dtell(`(shutdownApp): Ensuring no other Wingman processes are running...`);
        await ensureNoOtherWingmanProcesses();
        tell('All windows closed. Clean up complete.');
    };

    app.on("will-quit", () =>
    {   // This event is emitted when Electron receives the signal to exit (Cmd+Q on MacOS) and wants to start closing windows
        shutdownApp();
    });

    app.on("window-all-closed", () =>
    {
        shutdownApp();
    });
} // end of requestSingleInstanceLock block