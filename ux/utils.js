require('electron').ipcRenderer.on('tell', function (event, message) {
    console.log(message);
});
