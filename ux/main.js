const { app, BrowserWindow, BrowserView } = require("electron");

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
const { t } = require("i18next");

const APP_DIR = path.join(os.homedir(), ".wingman");
const logger = winston.createLogger({
    level: "silly",
    format: winston.format.printf(({ level, message, label, timestamp }) => {
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

function findOpenPortWithProgressAndCancel() {
    let cancelRequested = false;
    const ports = Array.from(
        { length: 65535 - 49152 + 1 },
        (_, i) => 49152 + i
    ); // Dynamic/private range

    const cancel = () => {
        cancelRequested = true;
    };

    const checkPort = (port, progressCallback) => {
        return new Promise((resolve, reject) => {
            if (cancelRequested) {
                reject(new Error("Cancelled"));
                return;
            }

            const server = net.createServer();
            server.listen(port, () => {
                server.once("close", () => resolve(port));
                server.close();
            });
            server.on("error", () => resolve(null));
        });
    };

    const findPort = (progressCallback) => {
        return new Promise(async (resolve) => {
            for (let i = 0; i < ports.length; i++) {
                if (cancelRequested) {
                    resolve(-1); // Cancelled
                    return;
                }
                const port = await checkPort(ports[i], progressCallback);
                if (port !== null) {
                    resolve(port);
                    return;
                }
                progressCallback(i + 1, ports.length);
            }
            resolve(-1); // No open port found
        });
    };

    return { findPort, cancel };
}
let serverProcess = null;
// let mainWindow;

logger.log("info", "Starting Wingman Electron");
const tell = (data) => {
    logger.log("info", data);
};

const etell = (data) => {
    logger.log("error", data);
};

const startNextJsServer = async (port) => {
    return new Promise((resolve, reject) => {
        logger.log("silly", "Starting Next.js server");
        const baseDir = app.isPackaged ? process.resourcesPath : __dirname;
        tell(`Base directory: ${baseDir}`);
        const nextDir = path.join(baseDir, ".next");
        if (!fs.existsSync(nextDir)) {
            const errMsg = "The .next directory does not exist. Something went wrong. Exiting...";
            etell(errMsg);
            reject(new Error(errMsg));
            return;
        }

        const exe = "npx";
        const args = ["next", "start", "-p", `${port}`];
        tell(`Starting Next.js server: ${exe} ${args.join(" ")}`);
        serverProcess = child_process.spawn(exe, args, {
            cwd: baseDir,
            stdio: ["inherit", "pipe", "pipe"], // Change stdio to pipe for stdout and stderr
            shell: true,
            windowsHide: true,
        });

        serverProcess.stdout.on("data", (data) => {
            const output = data.toString();
            tell(`Server stdout: ${output}`);
            if (output.includes("✓ Ready in")) {
                resolve(serverProcess);
            }
        });

        serverProcess.stderr.on("data", (data) => {
            etell(`Server stderr: ${data.toString()}`);
        });

        serverProcess.on("error", (error) => {
            etell(`Error starting server: ${error}`);
            reject(error);
        });

        serverProcess.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Server process closed with code: ${code}`));
            }
        });
    });
};

const launchWingmanExecutable = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            let platform = os.platform();
            let architecture = os.arch();
            let executableName = 'wingman';
            let useCublas = false;

            const graphics = await si.graphics();
            const gpus = graphics.controllers;
            const hasNvidiaGpu = gpus.some(gpu => gpu.vendor.toLowerCase().includes('nvidia'));

            if (hasNvidiaGpu) {
                useCublas = true;
            }

            const baseDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, 'server');
            tell(`Base directory: ${baseDir}`);
            let executablePath = "";
            let cwd = "";
            switch (platform) {
                case 'win32':
                    platform = useCublas ? 'windows-cublas' : 'windows';
                    executableName += '.exe';
                    cwd = path.join(baseDir, 'wingman', platform, 'bin');
                    executablePath = path.join(cwd, executableName);
                    break;
                case 'linux':
                    platform = useCublas ? 'linux-cublas' : 'linux';
                    cwd = path.join(baseDir, 'wingman', platform, 'bin');
                    executablePath = path.join(cwd, executableName);
                    break;
                case 'darwin':
                    if (architecture === 'arm64') {
                        platform = 'macos-metal';
                    } else {
                        platform = 'macos';
                    }
                    // run the macOS version of the wingman executable
                    cwd = path.join(baseDir, 'wingman', platform, 'bin', 'wingman.app', 'Contents', 'MacOS');
                    executablePath = path.join(cwd, executableName);
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${platform}`));
                    return;
            }
            tell(`Platform: ${platform}`);

            tell(`Launching Wingman executable: ${executablePath}`);
            const subprocess = child_process.spawn(executablePath, [], {
                stdio: ['inherit', 'pipe', 'pipe'],
                shell: true,
                cwd: path.join(baseDir, 'wingman', platform, 'bin'),
                windowsHide: true,
            });

            subprocess.stdout.on('data', (data) => {
                const output = data.toString();
                tell(`Wingman stdout: ${output}`);
                if (output.includes("Wingman websocket accepting connections")) {
                    resolve(subprocess);
                }
            });

            subprocess.stderr.on('data', (data) => {
                etell(`Wingman stderr: ${data.toString()}`);
            });

            subprocess.on('error', (err) => {
                etell(`Failed to start subprocess: ${err}`);
                reject(err);
            });

        } catch (error) {
            etell(`Error launching Wingman executable: ${error}`);
            reject(error);
        }
    });
};

const processes = [];

const createWindow = () => {
    win = new BrowserWindow({
        width: 1366,
        height: 1080,
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
    const { findPort, cancel } = findOpenPortWithProgressAndCancel();
    findPort((current, total) => tell(`Checked ${current} of ${total} ports.`))
        .then(async (port) => {
            tell(`Found an open port: ${port}`);
            processes.push(await launchWingmanExecutable());
            processes.push(await startNextJsServer(port));
            win.loadURL(url.format({
                pathname: `localhost:${port}`,
                protocol: 'http:',
                slashes: true
            }));
        })
        .catch((error) => {
            etell(`Error finding open port: ${error}`);
            // display error message
            win.webContents.executeJavaScript(
                `electronAPI.sendError("${error.message}")`
              );
        });
};

// updateElectronApp(); // additional configuration options available

ipcMain.on("report-error", (event, error) => {
    etell(`Error from renderer: ${error}`);
    win.loadURL(`error.html?error=${encodeURIComponent(error)}`);
});

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
    for (let i = 0; i < processes.length; i++) {
        processes[i].kill();
    }
});
