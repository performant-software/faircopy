const { parentPort } = require('worker_threads')

function run() {
    parentPort.on('message', (msg) => {
        const { command, resourceID, data } = msg
        
        switch( command ) {
            case 'parse':
                parentPort.postMessage({ messageType: 'load-index', resourceID, respData: JSON.parse(data) })    
                break
            case 'stringify':
                parentPort.postMessage({ messageType: 'save-index', resourceID, respData: JSON.stringify(data) })    
                break
            default:
                throw new Error(`Unrecognized command to big json worker ${command}.`)
        }
    })
}

// RUN THREAD /////////////////
run()