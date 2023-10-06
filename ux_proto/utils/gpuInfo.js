const si = require('systeminformation');

// promises style - new since version 3
si.graphics()
    .then(data =>
    {
        const gpuCount = data.controllers.length;
        // show ram info for each gpu
        for (let i = 0; i < gpuCount; i++)
        {
            const gpuInfo = data.controllers[i];
            const format = `GPU ${i} - ${gpuInfo.model}: ${gpuInfo.memoryTotal} Total, ${gpuInfo.memoryFree} Free`;
            console.log(format);
        }
    })
    .catch(error => console.error(error));