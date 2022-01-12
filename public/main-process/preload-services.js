const electron = require("electron")
const path = require('path');

const readClipBoardHTML = function readClipBoardHTML() {
    return electron.clipboard.readHTML()
}

const readClipBoardText = function readClipBoardText() {
    return electron.clipboard.readText()
}

const copyToClipBoard = function copyToClipBoard(content) {
    electron.clipboard.writeText(content)
}

const copyToClipBoardHTML = function copyToClipBoardHTML(content) {
    electron.clipboard.writeHTML(content)
}

const ipcRegisterCallback = function ipcRegisterCallback( eventID, callback ) {
    electron.ipcRenderer.on(eventID,callback)
}

const ipcRemoveListener = function ipcRemoveListener( eventID, callback ) {
    electron.ipcRenderer.removeListener(eventID,callback)
}

const ipcSend = function ipcSend( eventID, ...params) {
    electron.ipcRenderer.send(eventID,...params)
}

const getBasename = function getBasename( mypath, ext ) {
    return path.basename(mypath,ext)
}

const openBuyNowWebpage = function openBuyNowWebpage() {
    electron.shell.openExternal("https://faircopy-activate-2-staging.herokuapp.com/?scrollTo=prices");
}

exports.services = { 
    ipcRegisterCallback, 
    ipcRemoveListener,
    ipcSend, 
    readClipBoardHTML, 
    readClipBoardText,
    copyToClipBoard,
    copyToClipBoardHTML,
    getBasename,
    openBuyNowWebpage
}