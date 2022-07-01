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
                        const { resourceEntry, parentEntry, resource } = msg
                        fairCopyApplication.sendToMainWindow('resourceOpened', { resourceEntry, parentEntry, resource } )        
                        log.info(`opened resourceID: ${resourceEntry.id}`)    
                    }
                    break
                case 'resource-view-update':
                    {
                        const { resourceView, remoteResources } = msg
                        this.fairCopySession.sendResourceViewUpdate(resourceView,remoteResources)
                    }
                    break    
                case 'id-map-update': 
                {
                    const { idMapAuthority } = this.fairCopySession
                    const { idMapData } = msg
                    idMapAuthority.setBaseMap(idMapData)
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

    requestResourceView(resourceView) {
        this.remoteProjectWorker.postMessage({ messageType: 'request-view', resourceView })
    }
}


exports.RemoteProject = RemoteProject