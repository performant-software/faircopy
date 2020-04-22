const { BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')

class ConfigManager {

    constructor() {
        this.configs = {}
        this.windows = []
        ipcMain.on('onConfigUpdate', this.onUpdate)
    }

    addWindow( windowID ) {
        this.windows.push(windowID)
    }

    removeWindow( windowID ) {
        const nextWindows = []
        for( const window of this.windows ) {
            if( window.id !== windowID ) {
                nextWindows.push(window)
            }
        }
        this.windows = nextWindows
    }

    onUpdate = ( browserFrame, configPath, incomingState ) => {
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
        for( const windowID of this.windows ) {
            const browserWindow = BrowserWindow.fromId(windowID)
            browserWindow.webContents.send('onConfigUpdated', configPath, nextState )    
        }
    }
}

exports.ConfigManager = ConfigManager