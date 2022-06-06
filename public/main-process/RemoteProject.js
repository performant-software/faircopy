const log = require('electron-log')
const { WorkerWindow } = require('./WorkerWindow')

class RemoteProject {

    constructor( fairCopySession, email, serverURL, projectID ) {
        const { fairCopyApplication } = fairCopySession
        const {baseDir} = fairCopyApplication
        this.fairCopySession = fairCopySession
        this.initRemoteProjectWorker( baseDir, fairCopyApplication.isDebugMode(), email, serverURL, projectID ).then(() => {
            this.remoteProjectWorker.postMessage({ messageType: 'open' })
        })
    }

    initRemoteProjectWorker( baseDir, debug, email, serverURL, projectID ) {
        this.remoteProjectWorker = new WorkerWindow( baseDir, debug, 'remote-project', (msg) => {
            const { messageType } = msg

            switch( messageType ) {
                case 'resource-data':
                    {
                        const { fairCopyApplication } = this.fairCopySession
                        const { resourceID, resource } = msg
                        fairCopyApplication.sendToMainWindow('resourceOpened', { resourceID, resource } )        
                        log.info(`opened resourceID: ${resourceID}`)    
                    }
                    break
                case 'resource-update':
                    {
                        const { fairCopyApplication } = this.fairCopySession
                        fairCopyApplication.sendToAllWindows('resourceEntryUpdated', { remoteUpdate: true } )
                    }
                    break    
                case 'id-map-update': 
                {
                    const { idMapAuthority } = this.fairCopySession
                    const { idMapData } = msg
                    idMapAuthority.update(idMapData)
                }
                break
                // case 'config-update':
                default:
                    throw new Error(`Unrecognized message type ${messageType} received from remote project: ${JSON.stringify(msg)}`)
            }
        })
        
        return this.remoteProjectWorker.start({email, serverURL, projectID})
    }

    close() {
        this.remoteProjectWorker.postMessage({ messageType: 'close' })
    }

    openResource(resourceID) {
        this.remoteProjectWorker.postMessage({ messageType: 'get-resource', resourceID })
    }
}


exports.RemoteProject = RemoteProject