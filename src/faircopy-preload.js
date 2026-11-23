const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
    'fairCopy',
    {
        ipcRegisterCallback: ( eventID, callback ) => {
            ipcRenderer.on(eventID,callback)
        },

        ipcRegisterCallbackOnce: ( eventID, callback ) => {
            ipcRenderer.once(eventID,callback)
        },

        ipcRemoveListener: ( eventID, callback ) => {
            ipcRenderer.removeListener(eventID,callback)
        },

        ipcSend: ( eventID, ...params) => {
            // console.log(`sending ${eventID} ${params}`)
            ipcRenderer.send(eventID,...params)
        },

        getSsoUrl: () => {
            return ipcRenderer.invoke('get-sso-url')
        },

        getPlatform: () => {
            return process.platform
        },

        startAuthServer: (serverUrl) => {
            return ipcRenderer.invoke('start-auth-server', serverUrl)
        },

        stopAuthServer: () => {
            return ipcRenderer.invoke('stop-auth-server')
        }
    }
)