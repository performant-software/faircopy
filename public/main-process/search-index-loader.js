const { workerData, parentPort } = require('worker_threads')

function run() {
    const { indexJSON } = workerData
    const rawIndex = JSON.parse(indexJSON)
    parentPort.postMessage({ rawIndex })
}

// RUN THREAD /////////////////
run()