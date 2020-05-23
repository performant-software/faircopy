const electron = require("electron")

const readClipBoardHTML = function readClipBoardHTML() {
    return electron.clipboard.readHTML()
}

const copyToClipBoard = function copyToClipBoard(content) {
    electron.clipboard.writeText(content)
}

const ipcRegisterCallback = function ipcRegisterCallback( eventID, callback ) {
    electron.ipcRenderer.on(eventID,callback)
}

const ipcSend = function ipcSend( eventID, ...params) {
    electron.ipcRenderer.send(eventID,...params)
}

exports.services = { 
    ipcRegisterCallback, 
    ipcSend, 
    readClipBoardHTML, 
    copyToClipBoard
}