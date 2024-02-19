const { app, BrowserWindow } = require('electron');
const child_process = require('node:child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const WINGMAN_UI_PORT = 6568;
let serverProcess = null;

const startNextJsServer = () =>
{
    // ensure the .next exists before starting the server
    const nextDir = path.join(__dirname, '.next');
    if (!fs.existsSync(nextDir))
    {
        console.error('The .next directory does not exist. Something went wrong. Exiting...');
        process.exit(1);
    }
    // execPath the next.js server. set cwd to the root of the project
    const exe = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    serverProcess = child_process.fork(exe, ['start', '-p', `${WINGMAN_UI_PORT}`], { cwd: __dirname, stdio: 'pipe' });
    // const exe = path.join(nextDir, 'server', 'pages', 'index.js');
    // serverProcess = child_process.spawn(exe, { cwd: __dirname });

    serverProcess.on('error', (error) =>
    {
        if (error)
        {
            console.error('Error starting server:', error);
            return;
        }
    });
    serverProcess.on('message', (message) =>
    {
        console.log('Message from server:', message);
    });
    serverProcess.on('exit', (code, signal) =>
    {
        console.log('Server process exited with code:', code, 'and signal:', signal);
    });
    serverProcess.stdout.on('data', (data) =>
    {
        console.log('Server stdout:', data.toString());
    });
    serverProcess.stderr.on('data', (data) =>
    {
        console.error('Server stderr:', data.toString());
    });
    serverProcess.on('close', (code) =>
    {
        console.log('Server process closed with code:', code);
    });
};

const createWindow = () =>
{
    const win = new BrowserWindow({
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
    // win.loadFile('index.html') ;
    // win.webContents.openDevTools();
};

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