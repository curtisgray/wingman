const { app, BrowserWindow } = require('electron');
// const { fork, execPath } = require('child_process');
const child_process = require('node:child_process');
const path = require('node:path');
const process = require('node:process');
const fs = require('node:fs');

let serverProcess = null;

const createWindow = () =>
{
    // ensure the .next exists before starting the server
    const nextDir = path.join(__dirname, '.next');
    if (!fs.existsSync(nextDir))
    {
        console.error('The .next directory does not exist. Something went wrong. Exiting...');
        process.exit(1);
    }
    // node ./node_modules/next/dist/bin/next start
    // if on windows use node_modules\.bin\next.cmd, otherwise use node_modules/.bin/next
    // if (process.platform === 'win32') {
    //     nodeExe = path.join(__dirname, 'node_modules', '.bin', 'next.cmd');
    // } else {
    //     nodeExe = path.join(__dirname, 'node_modules', '.bin', 'next');
    // }
    const nodeExe = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    // serverProcess = execFile(nodeExe, ['start'], (error, stdout, stderr) =>
    // execPath the next.js server. set cwd to the root of the project
    serverProcess = child_process.fork(nodeExe, ['start', '-p', '6567'], { cwd: __dirname });
    // serverProcess = child_process.fork('node', [nodeExe, 'start'], { cwd: __dirname });
    // serverProcess = child_process.execFile(nodeExe, ['start'], { cwd: __dirname });
    // serverProcess = child_process.execFile(nodeExe, { cwd: __dirname });
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
    const win = new BrowserWindow({
        width: 1366,
        height: 1080,
        webPreferences: {
            nodeIntegration: true,
            // contextIsolation: false,
            // enableRemoteModule: true,
        },
    });

    win.loadURL('http://localhost:6567');
};

app.whenReady().then(() =>
{
    createWindow();
});