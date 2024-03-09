const { BrowserWindow, app, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create a new window to display the log file. Return the window object so that it can be managed by the caller.
exports.createLogWindow = () =>
{
    let logWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(app.getAppPath(), 'tron', 'preload.js') // Adjust as necessary
        },
        autoHideMenuBar: true
    });

    logWindow.loadFile(path.join(app.getAppPath(), 'tron', 'log-display.html'));

    const logFilePath = path.join(os.homedir(), '.wingman', 'wingman.log');

    // Read the initial content of the log file and send it to the renderer process.
    fs.readFile(logFilePath, 'utf-8', (err, data) =>
    {
        if (logWindow === null) return;

        if (err)
        {
            console.error('Failed to read log file', err);
            return;
        }
        logWindow.webContents.once('dom-ready', () =>
        {
            logWindow.webContents.send('logData', data);
        });
    });

    // Watch the log file for changes and send new data as it is appended.
    fs.watch(logFilePath, { encoding: 'utf-8' }, (eventType, filename) =>
    {
        if (logWindow === null) return;

        if (eventType === 'change')
        {
            fs.readFile(logFilePath, 'utf-8', (err, data) =>
            {
                if (err)
                {
                    console.error('Failed to read log file', err);
                    return;
                }
                logWindow.webContents.send('logData', data);
            });
        }
    });

    logWindow.on('closed', () =>
    {
        logWindow = null;
    });

    return logWindow;
};
