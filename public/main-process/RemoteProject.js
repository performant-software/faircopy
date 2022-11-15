const { WorkerWindow } = require('./WorkerWindow')

class RemoteProject {

    constructor( fairCopySession, userID, serverURL, projectID ) {
        const { fairCopyApplication } = fairCopySession
        const {baseDir} = fairCopyApplication
        this.fairCopySession = fairCopySession
        this.initRemoteProjectWorker( baseDir, fairCopyApplication.isDebugMode(), userID, serverURL, projectID ).then(() => {
            this.remoteProjectWorker.postMessage({ messageType: 'open' })
        })
    }

    initRemoteProjectWorker( baseDir, debug, userID, serverURL, projectID ) {
        this.remoteProjectWorker = new WorkerWindow( baseDir, debug, 'remote-project', (msg) => {
            const { messageType } = msg

            switch( messageType ) {
                case 'resource-data':
                    {
                        const { resourceEntry, parentEntry, content, xmlID } = msg
                        this.fairCopySession.resourceOpened( resourceEntry, parentEntry, content, xmlID )   
                    }
                    break
                case 'got-parent':
                    { 
                        const { resourceEntry, parentEntry, content, xmlID } = msg
                        this.fairCopySession.parentFound( resourceEntry, parentEntry, content, xmlID )   
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
                case 'resources-updated':
                {
                    const { resources } = msg
                    // TODO determine which resources need to be updated 
                    // TODO what does this have to do with delete again?
                    this.fairCopySession.requestResourceView()
                }
                break
                default:
                    throw new Error(`Unrecognized message type ${messageType} received from remote project: ${JSON.stringify(msg)}`)
            }
        })
        
        return this.remoteProjectWorker.start({userID, serverURL, projectID})
    }

    close() {
        this.remoteProjectWorker.postMessage({ messageType: 'close' })
    }

    getParentEntry(resourceEntry, content, xmlID) {
        this.remoteProjectWorker.postMessage({ messageType: 'get-parent', resourceEntry, content, xmlID })
    }

    openResource(resourceID, xmlID) {
        this.remoteProjectWorker.postMessage({ messageType: 'get-resource', resourceID, xmlID })
    }

    requestResourceView(resourceView) {
        this.remoteProjectWorker.postMessage({ messageType: 'request-view', resourceView })
    }
}


exports.RemoteProject = RemoteProject