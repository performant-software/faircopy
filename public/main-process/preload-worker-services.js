const electron = require("electron")

const getElectron = function getElectron() {
    return electron
}

const ipcRegisterCallback = function ipcRegisterCallback( eventID, callback ) {
    electron.ipcRenderer.on(eventID,callback)
}

exports.services = { 
    getElectron,
    ipcRegisterCallback
}