const electron = require("electron")

const configCallbacks = {}

const initConfigClient = function initConfigClient() {

    const onConfigUpdate = () => {
        // send out config to all subscribers

    }

    // start listening for config messages
    electron.ipcRenderer.on('onConfigUpdate',onConfigUpdate)
}

const configSubscribe = function configSubscribe(configID, callback) {
    // add this callback to callback list
}

const configUnsubscribe = function configUnsubscribe(configID, callback) {
    // remove this callback 
}

const updateConfig = function updateConfig(configID, configState ) {
    electron.ipcRenderer.send("onConfigUpdate", configID, configState)
}

exports.initConfigClient = initConfigClient
exports.configSubscribe = configSubscribe
exports.configUnsubscribe = configUnsubscribe
exports.updateConfig = updateConfig