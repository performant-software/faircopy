const { contextBridge, clipboard, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
    'fairCopy',
    {
        readClipBoardHTML: () => {
            return clipboard.readHTML()
        },

        readClipBoardText: () => {
            return clipboard.readText()
        },

        copyToClipBoard: (content) => {
            clipboard.writeText(content)
        },

        copyToClipBoardHTML: (content) => {
            clipboard.writeHTML(content)
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
)