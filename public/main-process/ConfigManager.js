const { BrowserWindow, ipcMain } = require('electron')

class ConfigManager {

    constructor() {
        this.subscribers = []        
        ipcMain.on('onConfigSubscribe', this.onConfigSubscribe)
        ipcMain.on('onConfigUnsubscribe', this.onConfigSubscribe)
        ipcMain.on('onConfigUpdate', this.receiveConfig)
    }

    onConfigSubscribe(configID, windowID) {
        // add a subscriber to the list

        // send the new subscriber the config from local storage
        const configState = localStorage.getItem(configID)
        this.sendConfig(windowID,configID,configState)
    }

    onConfigUnsubscribe(configID, windowID) {
        // remove a subscriber from the list
    }

    receiveConfig(configID, configState) {
        // write config to local storage
        // send the config to all subscribers
    }

    sendConfig(windowID, configID, configState ) {
        const browserWindow = BrowserWindow.fromId(windowID)
        browserWindow.webContents.send('onConfigUpdate', configID, configState )
    }    
}


exports.ConfigManager = ConfigManager