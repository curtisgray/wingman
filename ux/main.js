const { app, BrowserWindow, BrowserView } = require('electron');

// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit();
// const { updateElectronApp } = require('update-electron-app');
const child_process = require('node:child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const APP_DIR = path.join(os.homedir(), ".wingman");
const winston = require('winston');
const logger = winston.createLogger({
    level: 'silly',
    format: winston.format.printf(({ level, message, label, timestamp }) =>
    {
        const ts = timestamp ? timestamp : new Date().toISOString();
        return `[${ts}] [${level}] ${message}`;
    }),
    defaultMeta: { service: 'wingman-electron' },
    transports: [
        new winston.transports.File({ filename: path.join(APP_DIR, 'wingman.log'), level: 'silly' }),
    ],
});

const WINGMAN_UI_PORT = 6570;
let serverProcess = null;
let mainWindow;

logger.log('trace', 'Starting Wingman Electron');
const tell = (data) =>
{
    logger.log('info', data);
    mainWindow?.webContents.send('tell', data);
};

const etell = (data) =>
{
    logger.log('error', data);
};

const startNextJsServer = () =>
{
    logger.log('trace', 'Starting Next.js server');
    // ensure the .next exists before starting the server
    const nextDir = path.join(__dirname, '.next');
    logger.log('trace', `Checking for .next directory at ${nextDir}`);
    if (!fs.existsSync(nextDir))
    {
        tell('The .next directory does not exist. Something went wrong. Exiting...');
        process.exit(1);
    }
    // execPath the next.js server. set cwd to the root of the project
    const exe = 'npx'; // Using npx to execute the local Next.js CLI
    const args = ['next', 'start', '-p', `${WINGMAN_UI_PORT}`];
    logger.log('trace', `Starting Next.js server with ${exe} ${args.join(' ')}`);
    serverProcess = child_process.spawn(exe, args, { cwd: __dirname, stdio: 'pipe', shell: true });
    logger.log('trace', `Next.js server process PID: ${serverProcess?.pid}`);

    serverProcess.on('error', (error) =>
    {
        if (error)
        {
            etell(`Error starting server: ${error}`);
            return;
        }
    });
    serverProcess.on('message', (message) =>
    {
        tell(`Message from server: ${message}`);
    });
    serverProcess.on('exit', (code, signal) =>
    {
        tell(`Server process exited with code: ${code} and signal: ${signal}`);
    });
    serverProcess.stdout.on('data', (data) =>
    {
        tell(`Server stdout: ${data.toString()}`);
    });
    serverProcess.stderr.on('data', (data) =>
    {
        tell(`Server stderr: ${data.toString()}`);
    });
    serverProcess.on('close', (code) =>
    {
        tell(`Server process closed with code: ${code}`);
    });
};

const createWindow = () =>
{
    win = new BrowserWindow({
        width: 1366,
        height: 1080,
        webPreferences: {
            nodeIntegration: true,
            // contextIsolation: false,
            // enableRemoteModule: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadURL(`http://localhost:${WINGMAN_UI_PORT}`);
    // win.loadFile('index.html');
    const view = new BrowserView();
    win.setBrowserView(view);
    // set the bounds of the view to the size of bottom third of the main window,
    //   and update it's dimensions on resize
    const [width, height] = win.getSize();
    view.setBounds({ x: 0, y: height - height / 3, width: width, height: height / 3 });
    view.setAutoResize({ width: true, height: true });

    view.webContents.loadURL('index.html');

    // win.webContents.openDevTools();
};

// updateElectronApp(); // additional configuration options available

startNextJsServer();

app.whenReady().then(() =>
{
    createWindow();

    app.on('activate', () =>
    {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () =>
{
    if (process.platform !== 'darwin') app.quit();
});