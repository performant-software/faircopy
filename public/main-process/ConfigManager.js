const { BrowserWindow } = require('electron')
const fs = require('fs')

class ConfigManager {

    constructor() {
        this.configs = {}
        //ipcMain.on('onConfigUpdate', this.onUpdate)
    }

    onUpdate = ( sender, configPath, incomingState ) => {
        let nextState

        // if there is no incoming state
        if( !incomingState ) {
            // load from file if it isn't loaded
            const currentState = this.configs[configPath]
            if( !currentState ) {
                const configJSON = fs.readFileSync( configPath )
                nextState = JSON.parse(configJSON)
            } else {
                nextState = currentState
            }
        } else {
            nextState = incomingState
        }

        this.configs[configPath] = nextState

        // broadcast config state to all windows
        const browserWindows = BrowserWindow.getAllWindows()
        for( const browserWindow of browserWindows ) {
            browserWindow.webContents.send('onConfigUpdated', configPath, nextState )    
        }
    }
}

exports.ConfigManager = ConfigManager