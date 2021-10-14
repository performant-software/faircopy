const { BrowserWindow, ipcMain } = require('electron')

class WorkerWindow {
    constructor(baseDir, debug, workerID, messageHandler) {
        this.baseDir = baseDir
        this.debug = debug
        this.workerID = workerID
        this.messageHandler = messageHandler
    }

    async start( workerData ) {
    
        // if this message is for this worker, send to callback
        ipcMain.on('worker-window-message', (e,wid,msg) => {
            if( wid === this.workerID ) this.messageHandler(msg)
        })

        this.workerWindow = new BrowserWindow({
            show: this.debug,
            webPreferences: {
                webSecurity: !this.debug,
                enableRemoteModule: false,
                contextIsolation: false,
                preload: `${this.baseDir}/worker-window-preload.js`
            }
        })
        if( this.debug ) this.workerWindow.webContents.openDevTools({ mode: 'bottom'} )
        
        // and load the index.html of the app.
        if( this.debug ) {
            await this.workerWindow.loadURL('http://localhost:4000')
        } else {
            await this.workerWindow.loadFile('build/index.html')
        }
        
        this.workerWindow.webContents.send('init', { workerID: this.workerID, workerData }) 
    }

    postMessage(messageData) {
        this.workerWindow.webContents.send('message', messageData)
    }

    terminate() {
        // TODO
    }
}


exports.WorkerWindow = WorkerWindow