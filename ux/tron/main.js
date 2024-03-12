const { app, BrowserWindow } = require("electron");

// run this as early in the main process as possible
if (require("electron-squirrel-startup")) app.quit();
// const { updateElectronApp } = require('update-electron-app');
const child_process = require("node:child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { ipcMain } = require("electron");
const winston = require("winston");
const net = require("net");
const si = require('systeminformation');
const url = require('url');
const http = require('http');
const { createMenu } = require('./menu');

const APP_DIR = path.join(os.homedir(), ".wingman");
let LOGGER_WINDOW = null;

const logger = winston.createLogger({
    level: "silly",
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
        });
    };

    return { findPort, cancel };
};

let wingmanProcessController = null;
let nextJsServerProcessController = null;
// let mainWindow;

logger.log("info", "Starting Wingman Electron");
const tell = (data) =>
{
    logger.log("info", data);
};

const etell = (data) =>
{
    logger.log("error", data);
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

const launchWingmanExecutable = async (baseDir) =>
{
    return new Promise(async (resolve, reject) =>
    {
        try
        {
            let executableName = 'wingman_launcher';
            let useCublas = false;

            const graphics = await si.graphics();
            const gpus = graphics.controllers;
            const hasNvidiaGpu = gpus.some(gpu => gpu.vendor.toLowerCase().includes('nvidia'));

            if (hasNvidiaGpu)
            {
                useCublas = true;
            }

            tell(`Wingman Base directory: ${baseDir}`);
            let executablePath = "";
            let cwd = "";
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
                    } else
                    {
                        wingman_runtime = 'macos';
                    }
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${process.platform}`));
                    return;
            }
            cwd = path.join(baseDir, 'wingman', wingman_runtime, 'bin');
            executablePath = path.resolve(path.join(cwd, executableName));
            tell(`Wingman Runtime: ${wingman_runtime}`);

            tell(`Launching Wingman executable: ${executablePath}`);
            const subprocess = child_process.spawn(executablePath, [], {
                stdio: ['inherit', 'pipe', 'pipe'],
                // shell: true,
                cwd: path.join(baseDir, 'wingman', wingman_runtime, 'bin'),
                windowsHide: true,
            // }, { signal });
            });

            let serverReady = false;
            subprocess.stdout.on('data', (data) =>
            {
                const output = data.toString();
                tell(`Wingman stdout: ${output}`);
                // Server is ready: `96ad0fad-82da-43a9-a313-25f51ef90e7c`
                if (output.includes("96ad0fad-82da-43a9-a313-25f51ef90e7c"))
                {
                    // resolve(controller);
                    resolve({
                        terminate: () =>
                        {
                            tell('Terminating Wingman...');
                            // send a get request to http://localhost:6568/api/shutdown and wait
                            //   for `All services stopped.` response from `output` before returning
                            const options = {
                                hostname: 'localhost',
                                port: 6568,
                                path: '/api/shutdown',
                                method: 'GET',
                            };
                            const req = http.request(options, (res) =>
                            {
                                res.on('data', (d) =>
                                {
                                    tell(`Wingman shutdown response: ${d}`);
                                });
                            });
                            req.end();
                            subprocess.kill('SIGINT');
                        }
                    });
                }

                if (!serverReady)
                {
                    // dyld error: `dyld: Symbol not found`
                    if (output.includes("dyld: Symbol not found"))
                    {
                        etell(`Server stdout: ${output}`);
                        reject(new Error('dyld: Symbol not found'));
                    }
                    // bad image error: `illegal hardware instruction`
                    if (output.includes("illegal hardware instruction"))
                    {
                        etell(`Server stdout: ${output}`);
                        reject(new Error('illegal hardware instruction'));
                    }
                    // `Wingman Launcher Exception: `
                    if (output.includes("Wingman Launcher Exception: "))
                    {
                        etell(`Server stdout: ${output}`);
                        reject(new Error('Wingman Launcher Exception'));
                    }
                }
            });

            subprocess.stderr.on('data', (data) =>
            {
                etell(`Wingman stderr: ${data.toString()}`);
            });

            subprocess.on('error', (err) =>
            {
                etell(`Failed to start subprocess: ${err}`);
                reject(err);
            });

        } catch (error)
        {
            etell(`Error launching Wingman executable: ${error}`);
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

        let serverReady = false;
        child.stdout.on("data", (data) =>
        {
            const output = data.toString();
            tell(`Server stdout: ${output}`);
            // Server is ready: `✓ Ready in`
            if (output.includes("✓ Ready in"))
            {
                serverReady = true;
                resolve({
                    terminate: () =>
                    {
                        tell('Terminating Next.js server...');
                        child.kill('SIGINT'); // Terminate the child process
                    }
                });
            }

            if (!serverReady)
            {
                // dyld error: `dyld: Symbol not found`
                if (output.includes("dyld: Symbol not found"))
                {
                    etell(`Server stdout: ${output}`);
                    reject(new Error('dyld: Symbol not found'));
                }
                // bad image error: `illegal hardware instruction`
                if (output.includes("illegal hardware instruction"))
                {
                    etell(`Server stdout: ${output}`);
                    reject(new Error('illegal hardware instruction'));
                }
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
    win = new BrowserWindow({
        width: 1366,
        height: 1080,
        icon: path.resolve(path.join(__dirname, "..", "assets", "logo-color")),
        webPreferences: {
            nodeIntegration: true,
            // contextIsolation: false,
            // enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // win.webContents.openDevTools();

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

            wingmanProcessController = await launchWingmanExecutable(wingmanDir);
            nextJsServerProcessController = await startNextJsStandaloneServer(port, path.join(nextDir, 'server.js'));
            win.loadURL(url.format({
                pathname: `localhost:${port}`,
                protocol: 'http:',
                slashes: true
            }));
        })
        .catch((error) =>
        {
            // etell(`Error finding open port: ${error}`);
            // display error message
            win.webContents.executeJavaScript(
                `electronAPI.sendError("${error.message}")`
            );
        });

    win.on("closed", () =>
    {
        win = null;
        // close the logger window
        if (LOGGER_WINDOW)
        {
            LOGGER_WINDOW.close();
            LOGGER_WINDOW = null;
        }
    });
};

// updateElectronApp(); // additional configuration options available

ipcMain.on("report-error", (event, error) =>
{
    etell(`Error from renderer: ${error}`);
    win.loadURL(`error.html?error=${encodeURIComponent(error)}`);
});

app.whenReady().then(() =>
{
    createWindow();
    createMenu(onShowLogViewer => {
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
    });

    app.on("activate", () =>
    {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

let alreadyShuttingDown = false;

const shutdownApp = async () =>
{
    if (alreadyShuttingDown) return;

    tell('All windows closed. Cleaning up...');
    // close the logger window
    if (LOGGER_WINDOW)
    {
        LOGGER_WINDOW.close();
    }

    if (process.platform !== "darwin") app.quit();

    // TODO: the processes are not being killed when the app is closed. perhaps
    //    the abort controller is not being triggered. need to investigate.
    if (nextJsServerProcessController)
    {
        try {
            nextJsServerProcessController.terminate();
        } catch (error) {
            etell(`Error terminating Next.js server: ${error}`);
        }
    }

    if (wingmanProcessController)
    {
        try {
            wingmanProcessController.terminate();
        } catch (error) {
            etell(`Error terminating Wingman server: ${error}`);
        }
    }
    alreadyShuttingDown = true;
    tell('All windows closed. Clean up complete.');
};

app.on("will-quit", () =>
{
    shutdownApp();
});

app.on("window-all-closed", () =>
{
    shutdownApp();
});
