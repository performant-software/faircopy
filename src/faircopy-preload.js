const electron = require("electron")
// const { contextBridge } = require("electron");
const path = require('path');
const fs = require("fs")
const os = require("os")
const JSZip = require('jszip')

// contextBridge.exposeInMainWorld(
//     'fairCopy',
window.fairCopy = {
        services: {
            getFs: function() {
                return fs
            },
            getOs: function() {
                return os
            },
            getJSZip: function() {
                return JSZip
            },
            readClipBoardHTML: () => {
                return electron.clipboard.readHTML()
            },
    
            readClipBoardText: () => {
                return electron.clipboard.readText()
            },
    
            copyToClipBoard: (content) => {
                electron.clipboard.writeText(content)
            },
    
            copyToClipBoardHTML: (content) => {
                electron.clipboard.writeHTML(content)
            },
    
            ipcRegisterCallback: ( eventID, callback ) => {
                electron.ipcRenderer.on(eventID,callback)
            },
    
            ipcRemoveListener: ( eventID, callback ) => {
                electron.ipcRenderer.removeListener(eventID,callback)
            },
    
            ipcSend: ( eventID, ...params) => {
                electron.ipcRenderer.send(eventID,...params)
            },
    
            getBasename: ( mypath, ext ) => {
                return path.basename(mypath,ext)
            },
    
            getPlatform: () => {
                return process.platform
            }
        }
    }
// )