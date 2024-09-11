const { ipcRenderer } = require("electron");

window.fairCopy = {
    getFs: function() {
        const fs = require("fs")
        return fs
    },
    getOs: function() {
        const os = require("os")
        return os
    },

    getJSZip: function() {
        const JSZip = require('jszip')
        return JSZip
    },

    ipcRegisterCallback: ( eventID, callback ) => {
        ipcRenderer.on(eventID,callback)
    },

    ipcRemoveListener: ( eventID, callback ) => {
        ipcRenderer.removeListener(eventID,callback)
    },

    ipcSend: ( eventID, ...params) => {
        ipcRenderer.send(eventID,...params)
    },

    getPlatform: () => {
        return process.platform
    }
}
