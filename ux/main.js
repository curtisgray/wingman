const { app, BrowserWindow, BrowserView } = require('electron');

// run this as early in the main process as possible
if (require('electron-squirrel-startup')) app.quit();
// const { updateElectronApp } = require('update-electron-app');
const child_process = require('node:child_process');
const path = require('path');
const fs = require('fs');
// const os = require('os');

const WINGMAN_UI_PORT = 6569;
let serverProcess = null;
let mainWindow;

const tell = (channel, data) =>
{
    mainWindow?.webContents.send(channel, data);
};

const startNextJsServer = () =>
{
    // ensure the .next exists before starting the server
    const nextDir = path.join(__dirname, '.next');
    if (!fs.existsSync(nextDir))
    {
        tell('The .next directory does not exist. Something went wrong. Exiting...');
        process.exit(1);
    }
    // execPath the next.js server. set cwd to the root of the project
    // const exe = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
    // serverProcess = child_process.fork(exe, ['start', '-p', `${WINGMAN_UI_PORT}`], { cwd: __dirname, stdio: 'pipe' });
    // const exe = path.join(nextDir, 'server', 'pages', 'index.js');
    // serverProcess = child_process.spawn(exe, { cwd: __dirname });
    const exe = 'npx'; // Using npx to execute the local Next.js CLI
    const args = ['next', 'start', '-p', `${WINGMAN_UI_PORT}`];
    serverProcess = child_process.spawn(exe, args, { cwd: __dirname, stdio: 'pipe', shell: true });

    serverProcess.on('error', (error) =>
    {
        if (error)
        {
            tell('Error starting server:', error);
            return;
        }
    });
    serverProcess.on('message', (message) =>
    {
        tell('Message from server:', message);
    });
    serverProcess.on('exit', (code, signal) =>
    {
        tell('Server process exited with code:', code, 'and signal:', signal);
    });
    serverProcess.stdout.on('data', (data) =>
    {
        tell('Server stdout:', data.toString());
    });
    serverProcess.stderr.on('data', (data) =>
    {
        tell('Server stderr:', data.toString());
    });
    serverProcess.on('close', (code) =>
    {
        tell('Server process closed with code:', code);
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
    // win.webContents.on('did-finish-load', () =>
    // {
    //     win.webContents.send('ping', 'whoooooooh!');

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