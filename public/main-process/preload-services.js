const electron = require("electron")
const path = require('path');

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

const getBasename = function getBasename( mypath, ext ) {
    return path.basename(mypath,ext)
}

exports.services = { 
    ipcRegisterCallback, 
    ipcSend, 
    readClipBoardHTML, 
    copyToClipBoard,
    getBasename
}