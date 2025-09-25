const { WorkerWindow } = require('./WorkerWindow')
const { migrateConfig } = require('./data-migration')
const { app } = require('electron')

class RemoteProject {

    constructor(fairCopySession, userID, serverURL, projectID) {
        const { fairCopyApplication, resourceViews } = fairCopySession
        const { currentView } = resourceViews
        const resourceView = resourceViews[currentView]
        const { baseDir } = fairCopyApplication
        this.fairCopySession = fairCopySession
        this.initRemoteProjectWorker(baseDir, !app.isPackaged, userID, serverURL, projectID).then(() => {
            this.open()
            if (currentView === 'home' && !resourceView?.indexParentID) {
                // at local project root, on remote project worker launch, check for abandoned resources
                this.markAbandonedResources(fairCopySession.getCurrentResourceIndex(), resourceViews['home'])
            }
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
                        const { resourceView, remoteResources, published } = msg
                        this.fairCopySession.sendResourceViewUpdate(resourceView, remoteResources, published)
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
                        this.remoteProjectWorker.postMessage({ messageType: 'refresh-project-info' })
                    }
                    break
                case 'config-check-out-result':
                    {
                        const { status } = msg
                        const { fairCopyApplication } = this.fairCopySession
                        fairCopyApplication.sendToAllWindows('fairCopyConfigCheckedOut', { status })
                    }
                    break
                case 'resources-updated':
                    {
                        const { resources, published } = msg
                        // TODO determine which resources need to be updated 
                        // TODO what does this have to do with delete again?
                        this.fairCopySession.requestResourceView(published)
                    }
                    break
                case 'process-abandoned':
                    {
                        const { fairCopyApplication, projectStore } = this.fairCopySession
                        const { localResources, remoteResources } = msg
                        const abandoned = localResources?.filter((resource) => {
                            if (resource.type !== 'teidoc') return false
                            const remoteResource = remoteResources?.find((r) => r.id === resource.id)
                            if (remoteResource) {
                                // mismatched action type, or action type is the same but user ID is different,
                                // means this is probably an abandoned resource
                                return (
                                    resource.lastAction?.action_type !== remoteResource.lastAction?.action_type ||
                                    resource.lastAction?.user?.id !== remoteResource.lastAction?.user?.id
                                )
                            }
                            return false
                        })
                        const abandonedIDs = abandoned.map((r) => r.id)
                        const { resources } = projectStore.manifestData
                        const abandonedChildren = Object.values(resources)?.filter((r) => abandonedIDs.includes(r.parentResource))
                        if (abandoned.length > 0) {
                            fairCopyApplication.sendToMainWindow('markAbandoned', [...abandoned, ...abandonedChildren])
                        }
                    }
                    break
                case 'ner-updated':
                    {
                        const { xml, docID } = msg
                        const { fairCopyApplication } = this.fairCopySession
                        fairCopyApplication.sendToMainWindow('performNERResult', { xml, docID })
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

    requestResourceView(resourceView, published) {
        this.remoteProjectWorker.postMessage({ messageType: 'request-view', resourceView, published })
    }

    checkInConfig(config, firstAction) {
        this.remoteProjectWorker.postMessage({ messageType: 'checkin-config', config, firstAction })
    }

    checkOutConfig() {
        this.remoteProjectWorker.postMessage({ messageType: 'checkout-config' })
    }

    publish(teiDoc) {
        this.remoteProjectWorker.postMessage({ messageType: 'publish', teiDoc })
    }

    abandonCheckout(resource) {
        this.remoteProjectWorker.postMessage({ messageType: 'abandon', resource })
    }

    markAbandonedResources(resources, resourceView) {
        this.remoteProjectWorker.postMessage({ messageType: 'check-abandoned', resources, resourceView })
    }

    publishCss() {
        this.remoteProjectWorker.postMessage({ messageType: 'publish-css' })
    }

    performNER(fileContents, docID) {
        this.remoteProjectWorker.postMessage({ messageType: 'perform-ner', fileContents, docID })
    }
}


exports.RemoteProject = RemoteProject