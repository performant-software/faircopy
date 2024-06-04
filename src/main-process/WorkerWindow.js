const { BrowserWindow, ipcMain } = require('electron')

class WorkerWindow {
    constructor(baseDir, debug, workerID, messageHandler) {
        this.baseDir = baseDir
        this.debug = debug
        this.workerID = workerID
        this.messageHandler = messageHandler
    }

    messageForwarder = (e,wid,msg) => {
        // if this message is for this worker, send to callback
        if( wid === this.workerID ) this.messageHandler(msg)
    }

    closeMessageHandler = (e,wid) => {
        if( wid === this.workerID ) this.close()
    }

    async start( workerData ) {
    
        ipcMain.on('worker-window-message', this.messageForwarder)
        ipcMain.on('close-worker-window', this.closeMessageHandler)
        const preload = path.join(this.baseDir, `faircopy-preload.js`) 
 
        this.workerWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                // webSecurity: !this.debug,
                preload,
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            }
        })
        if( this.debug ) this.workerWindow.webContents.openDevTools({ mode: 'bottom'} )

        this.workerWindow.on('closed', () => {
            this.workerWindow = null
            ipcMain.removeListener('worker-window-message', this.messageForwarder)
            ipcMain.removeListener('close-worker-window', this.closeMessageHandler)
        })
        
        this.workerWindow.loadURL(WORKER_WINDOW_WEBPACK_ENTRY);
        this.workerWindow.webContents.send('init', { workerID: this.workerID, workerData }) 
    }

    postMessage(messageData) {
        if( this.workerWindow && !this.workerWindow.isDestroyed()  ) {
            this.workerWindow.webContents.send('message', messageData)
        }
    }

    close() {
        if( this.workerWindow && !this.workerWindow.isDestroyed()  ) {
            this.workerWindow.destroy()
        }
    }
}


exports.WorkerWindow = WorkerWindow