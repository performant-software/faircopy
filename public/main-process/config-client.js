const electron = require("electron")

const configCallbacks = {}

const initConfigClient = function initConfigClient() {

    const onConfigUpdated = (sender, configPath,configState) => {
        // send out config to all subscribers
        const callbacks = configCallbacks[configPath]
        if( callbacks ) {
            for( const callback of callbacks ) {
                callback(configState)
            }    
        }
    }

    // start listening for config updates
    electron.ipcRenderer.on('onConfigUpdated',onConfigUpdated)
}

const configSubscribe = function configSubscribe(configPath, callback, initialState) {
    // add this callback to callback list
    if( configCallbacks[configPath] ) {
        configCallbacks[configPath].push(callback)
    } else {
        configCallbacks[configPath] = [ callback ]
    }
    electron.ipcRenderer.send("onConfigUpdate", configPath, initialState )
}

const configUnsubscribe = function configUnsubscribe(configPath, doomedCallback) {
    // remove this callback 
    const callbacks = configCallbacks[configPath]
    if( callbacks ) {
        const nextCallbacks = []
        for( const callback of callbacks ) {
            if( callback !== doomedCallback ) {
                nextCallbacks.push(callback)
            }
        }
        configCallbacks[configPath] = nextCallbacks
    }
}

const updateConfig = function updateConfig(configPath, configState ) {
    electron.ipcRenderer.send("onConfigUpdate", configPath, configState)
}

exports.initConfigClient = initConfigClient
exports.configSubscribe = configSubscribe
exports.configUnsubscribe = configUnsubscribe
exports.updateConfig = updateConfig