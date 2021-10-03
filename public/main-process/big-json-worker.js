const { workerData, parentPort } = require('worker_threads')

// Can parse or stringify JSON on a worker thread. mode parameter is 'parse' or 'stringify'
function run() {
    const { mode, data } = workerData
    const respData = mode === 'parse' ? JSON.parse(data) : JSON.stringify(data)
    parentPort.postMessage({ respData })
}

// RUN THREAD /////////////////
run()