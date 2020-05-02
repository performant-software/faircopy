const fs = require('fs')
const electron = require("electron")
const { initConfigClient, configSubscribe, configUnsubscribe, updateConfig } = require('./config-client')

var versionNumber

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

const isDebugMode = function isDebugMode() {
 return ( process.env.FAIRCOPY_DEBUG_MODE !== undefined && process.env.FAIRCOPY_DEBUG_MODE !== false && process.env.FAIRCOPY_DEBUG_MODE !== 'false' )   
}

const getVersionNumber = function getVersionNumber() {
    if( versionNumber ) return versionNumber
    const debugPath = `${process.cwd()}/public/version.txt`
    const distPath = `${__dirname}/../version.txt`
    const versionFilePath = isDebugMode() ? debugPath : distPath
    versionNumber = readFileSync(versionFilePath)
    return versionNumber
}

const loadConfigFile = function loadAppData(filePath) {
    const debugBaseDir = `${process.cwd()}/public/main-process/config`
    const distBaseDir = `${__dirname}/config`
    const baseDir = isDebugMode() ? debugBaseDir : distBaseDir
    return readFileSync(`${baseDir}/${filePath}`)
}

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
    readFileSync, 
    writeFileSync, 
    ipcRegisterCallback, 
    ipcSend, 
    readClipBoardHTML, 
    copyToClipBoard,
    loadConfigFile, 
    isDebugMode,
    getVersionNumber,
    initConfigClient,
    configSubscribe, 
    configUnsubscribe, 
    updateConfig
}