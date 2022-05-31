const log = require('electron-log')
const { WorkerWindow } = require('./WorkerWindow')

class RemoteProject {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
    }

    initRemoteProjectWorker( baseDir, debug, email, serverURL ) {
        this.remoteProjectWorker = new WorkerWindow( baseDir, debug, 'remote-project', (msg) => {
            const { messageType } = msg

            switch( messageType ) {
                case 'resource-data':
                    {
                        const { resourceID, resource } = msg
                        this.fairCopyApplication.sendToMainWindow('resourceOpened', { resourceID, resource } )        
                        log.info(`opened resourceID: ${resourceID}`)    
                    }
                    break
                default:
                    throw new Error(`Unrecognized message type ${messageType} received from remote project: ${JSON.stringify(msg)}`)
            }
        })
        
        return this.remoteProjectWorker.start({email, serverURL})
    }

    openRemoteProject(email, serverURL) {
        const {baseDir} = this.fairCopyApplication
        const debug = this.fairCopyApplication.isDebugMode()
        this.initRemoteProjectWorker( baseDir, debug, email, serverURL )
    }

    close() {
        this.remoteProjectWorker.postMessage({ messageType: 'close' })
    }

    openResource(resourceID) {
        this.remoteProjectWorker.postMessage({ messageType: 'get-resource', resourceID })
    }
}


exports.RemoteProject = RemoteProject
