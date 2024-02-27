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
const next = require('next');
const http = require('http');
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

const getBaseDir = () => {
    let baseDir = path.join(__dirname, 'server');
    // check if the base directory exists, or this is running on macos, if not, use the resources path
    if (!fs.existsSync(baseDir)) {
        etell(`Base directory does not exist: ${baseDir}. Using Resources path.`);
        baseDir = path.dirname(process.resourcesPath);
    } else if (process.platform === 'darwin') {
        tell(`Running on MacOS. Using Resources path`);
        baseDir = path.resolve(path.dirname(path.join(__dirname, '..', 'Resources')));
    }
    return baseDir;
};

const startNextJs = (port, nextDir) => {
  return new Promise((resolve, reject) => {
    tell("Starting Next.js server");

    const dev = process.env.NODE_ENV !== 'production';
    const nextApp = next({ dev, conf: { distDir: nextDir } });
    const handleNextRequests = nextApp.getRequestHandler();

    nextApp.prepare()
      .then(() => {
        const server = http.createServer((req, res) => handleNextRequests(req, res));

        server.listen(port, (err) => {
          if (err) {
            console.error(err);
            reject(err);
            return;
          }
          console.log(`> Ready on http://localhost:${port}`);
          resolve(server);
        });
      })
      .catch(reject);
  });
};

const startNextJsServer = async (port, nextDir) => {
    return new Promise(async (resolve, reject) => {
        tell("Starting Next.js server");

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
            // cwd: __dirname,
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

const launchWingmanExecutable = async (baseDir) => {
    return new Promise(async (resolve, reject) => {
        try {
            let executableName = 'wingman';
            let useCublas = false;

            const graphics = await si.graphics();
            const gpus = graphics.controllers;
            const hasNvidiaGpu = gpus.some(gpu => gpu.vendor.toLowerCase().includes('nvidia'));

            if (hasNvidiaGpu) {
                useCublas = true;
            }

            tell(`Wingman Base directory: ${baseDir}`);
            let executablePath = "";
            let cwd = "";
            let wingman_runtime = "";
            switch (process.platform) {
                case 'win32':
                    wingman_runtime = useCublas ? 'windows-cublas' : 'windows';
                    executableName += '.exe';
                    break;
                case 'linux':
                    wingman_runtime = useCublas ? 'linux-cublas' : 'linux';
                    break;
                case 'darwin':
                    if (process.arch === 'arm64') {
                        wingman_runtime = 'macos-metal';
                    } else {
                        wingman_runtime = 'macos';
                    }
                    break;
                default:
                    reject(new Error(`Unsupported platform: ${process.platform}`));
                    return;
            }
            cwd = path.join(baseDir, 'wingman', wingman_runtime, 'bin');
            executablePath = path.join(cwd, executableName);
            tell(`Wingman Runtime: ${wingman_runtime}`);

            tell(`Launching Wingman executable: ${executablePath}`);
            const subprocess = child_process.spawn(executablePath, [], {
                stdio: ['inherit', 'pipe', 'pipe'],
                shell: true,
                cwd: path.join(baseDir, 'wingman', wingman_runtime, 'bin'),
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
            const baseDir = getBaseDir();
            tell(`Base directory: ${baseDir}`);
            const nextDir = path.join(baseDir, ".next");
            tell(`Next.js directory: ${nextDir}`);
            processes.push(await launchWingmanExecutable(baseDir));
            processes.push(await startNextJs(port, nextDir));
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
        // processes[i].kill();
        processes[i].close();
    }
});
