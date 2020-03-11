const fs = require('fs')
const electron = require("electron")

const readFileSync = function readFileSync(filePath) {
    return fs.readFileSync(filePath, "utf8")
}

const writeFileSync = function writeFileSync(filePath, contents) {
    fs.writeFileSync(filePath, contents, (err) => {
        if (err) {
            console.log(err)
        } 
    })
}

const loadConfigFile = function loadAppData(filePath) {
    const debugBaseDir = `${process.cwd()}/public/main-process/config`
    const distBaseDir = `${__dirname}/config`
    const debugMode = ( process.env.FAIRCOPY_DEBUG_MODE !== false && process.env.FAIRCOPY_DEBUG_MODE !== 'false' )
    const baseDir = (debugMode) ? debugBaseDir : distBaseDir
    return readFileSync(`${baseDir}/${filePath}`)
}

const readClipBoardHTML = function readClipBoardHTML() {
    return electron.clipboard.readHTML()
}

const ipcRegisterCallback = function ipcRegisterCallback( eventID, callback ) {
    electron.ipcRenderer.on(eventID,callback)
}

const ipcSend = function ipcSend( eventID, ...params) {
    electron.ipcRenderer.send(eventID,...params)
}

exports.services = { readFileSync, writeFileSync, ipcRegisterCallback, ipcSend, readClipBoardHTML, loadConfigFile }