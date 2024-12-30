const { WorkerWindow } = require('./WorkerWindow')
const { migrateConfig } = require('./data-migration')
const { app } = require('electron')

class RemoteProject {

    constructor(fairCopySession, userID, serverURL, projectID) {
        const { fairCopyApplication } = fairCopySession
        const { baseDir } = fairCopyApplication
        this.fairCopySession = fairCopySession
        this.initRemoteProjectWorker(baseDir, !app.isPackaged, userID, serverURL, projectID).then(() => {
            this.open()
        })
    }

    initRemoteProjectWorker(baseDir, debug, userID, serverURL, projectID) {
        this.remoteProjectWorker = new WorkerWindow(baseDir, debug, 'remote-project', (msg) => {
            const { messageType } = msg

            switch (messageType) {
                case 'resource-data':
                    {
                        const { resourceEntry, parentEntry, content, xmlID } = msg
                        this.fairCopySession.resourceOpened(resourceEntry, parentEntry, content, xmlID)
                    }
                    break
                case 'got-parent':
                    {
                        const { resourceEntry, parentEntry, content, xmlID } = msg
                        this.fairCopySession.parentFound(resourceEntry, parentEntry, content, xmlID)
                    }
                    break
                case 'project-info-update':
                    {
                        const { projectInfo } = msg
                        const { fairCopyApplication } = this.fairCopySession
                        fairCopyApplication.sendToAllWindows('updateProjectInfo', projectInfo)
                    }
                    break
                case 'resource-view-update':
                    {
                        const { resourceView, remoteResources } = msg
                        this.fairCopySession.sendResourceViewUpdate(resourceView, remoteResources)
                    }
                    break
                case 'parsed-annotation-data':
                    {
                        const { data, parentResourceID } = msg
                        this.fairCopySession.annotationDataReceived(data, parentResourceID)
                    }
                    break
                case 'id-map-update':
                    {
                        const { idMapAuthority } = this.fairCopySession
                        const { idMapData } = msg
                        idMapAuthority.setBaseMap(idMapData)
                    }
                    break
                case 'config-update':
                    {
                        const { config, configLastAction } = msg
                        const { fairCopyApplication, projectStore } = this.fairCopySession
                        const { baseConfig } = projectStore
                        const { config: appConfig } = fairCopyApplication
                        const { generatedWith } = projectStore.manifestData
                        // make sure that the incoming config is migrated to the latest schema                    
                        migrateConfig(generatedWith, baseConfig, config, appConfig)
                        fairCopyApplication.sendToAllWindows('updateFairCopyConfig', { config, configLastAction })
                    }
                    break
                case 'config-check-out-result':
                    const { status } = msg
                    const { fairCopyApplication } = this.fairCopySession
                    fairCopyApplication.sendToAllWindows('fairCopyConfigCheckedOut', { status })
                    break
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

        return this.remoteProjectWorker.start({ userID, serverURL, projectID })
    }

    open() {
        this.remoteProjectWorker.postMessage({ messageType: 'open' })
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

    checkInConfig(config, firstAction) {
        this.remoteProjectWorker.postMessage({ messageType: 'checkin-config', config, firstAction })
    }

    checkOutConfig() {
        this.remoteProjectWorker.postMessage({ messageType: 'checkout-config' })
    }
}


exports.RemoteProject = RemoteProject