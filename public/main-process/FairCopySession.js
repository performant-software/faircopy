const log = require('electron-log')
const { RemoteProject } = require('./RemoteProject')
const { ProjectStore } = require('./ProjectStore')
const { createIDMapAuthority } = require('./IDMapAuthority')

class FairCopySession {

    constructor( fairCopyApplication, targetFile ) {
        this.fairCopyApplication = fairCopyApplication
        this.projectStore = new ProjectStore(fairCopyApplication)
        this.projectStore.openProject(targetFile, this.onProjectOpened )
        this.remote = false
        this.remoteParentEntries = {}
        this.resourceView = { 
            indexParentID: null,
            currentPage: 0, 
            rowsPerPage: 100
        }
    }

    onProjectOpened = (projectData) => {
        const { idMap } = projectData
        const { manifestData } = this.projectStore
        this.remote = manifestData.remote

        // id map authority tracks ids across processes and server
        this.idMapAuthority = createIDMapAuthority(this.remote, idMap, (idMapData) => {
            this.fairCopyApplication.sendToAllWindows('IDMapUpdated', { idMapData } )
        })

        this.fairCopyApplication.sendToMainWindow('projectOpened', projectData )

        // init remote project if this is one
        if( this.remote ) {
            const { email, serverURL, projectID } = manifestData
            this.remoteProject = new RemoteProject(this, email, serverURL, projectID )
            this.initRemoteParents()
        }
    }

    // keep a cache of parent entries for local resources that have parents that aren't local
    initRemoteParents() {
        const localResources = this.projectStore.manifestData.resources
        for( const resource of Object.values(localResources) ) {
            const { parentID } = resource
            // if we don't have this entry, request it from server
            if( !localResources[parentID] && !this.remoteParentEntries[parentID] ) {
                this.openResource(parentID)          
            }
        }
    }

    closeProject() {
        this.projectStore.close()
        if( this.remoteProject ) this.remoteProject.close()
    }

    openImageResource(url) {
        this.projectStore.openImageResource(url)
    }

    setResourceMap(resourceMap, localID, parentID) {
        this.idMapAuthority.setResourceMap( resourceMap, localID, parentID )
    }

    addResource(resourceEntry,resourceData,resourceMap) {
        let idMap = null
        if( resourceMap ) {
            const parentID = this.projectStore.getParentID(resourceEntry)
            idMap = this.idMapAuthority.addResource(resourceEntry.localID,parentID,resourceMap)
            if(!this.projectStore.importInProgress) this.idMapAuthority.sendIDMapUpdate()    
        }
        this.projectStore.addResource(resourceEntry,resourceData,idMap)
    }

    removeResource(resourceID) {
        const { resources } = this.projectStore.manifestData
        const resourceEntry = resources[resourceID]
        if( resourceEntry ) {
            let idMap = null
            if( resourceEntry.type === 'teidoc') {
                // TODO all children must be removed before you can remove teidoc, but only for remote?
            }
            if( resourceEntry.type !== 'image' ) {
                const ids = this.projectStore.getLocalIDs(resourceID)
                idMap = this.idMapAuthority.removeResource(...ids)
                this.idMapAuthority.sendIDMapUpdate()    
            }
            this.projectStore.removeResource(resourceID,idMap)    
        } else {
            log.info(`Error removing resource entry: ${resourceID}`)
        }
    }

    recoverResource(resourceID) {
        this.projectStore.recoverResource(resourceID)
        const ids = this.projectStore.getLocalIDs(resourceID)
        this.idMapAuthority.recoverResource(...ids)
        this.idMapAuthority.sendIDMapUpdate()    
    }

    requestResourceView(nextResourceView=null) {
        if( this.remote ) {
            // request resource data from server
            const resourceView = nextResourceView ? nextResourceView : this.resourceView
            this.remoteProject.requestResourceView(resourceView)
        } else {
            // TODO respond right away from project store
            // this.fairCopyApplication.sendToAllWindows('resourceViewUpdate', this.resourceView, resourceIndex )
        }
    }

    requestCheckedOutResources() {
        if( this.remote ) {
            const checkedOutResources = this.projectStore.getCheckedOutResources()
            this.fairCopyApplication.sendToMainWindow('checkedOutResources', checkedOutResources )
        } else {
            log.info("Requested checked out view when project is not remote.")
        }
    }

    sendResourceViewUpdate(resourceView, remoteResources) {
        const resourceIndex = []

        const { resources } = this.projectStore.manifestData
        for( const remoteResource of remoteResources ) {
            const localResource = resources[remoteResource.id]
            if( localResource ) {
                resourceIndex.push(localResource)    
            } else {
                resourceIndex.push(remoteResource)
            }
        }
        this.resourceView = resourceView
        this.fairCopyApplication.sendToAllWindows('resourceViewUpdate', { resourceView: this.resourceView, resourceIndex })
    }
    
    searchProject(searchQuery) {
        this.projectStore.searchIndex.searchProject(searchQuery) 
    }

    saveResource(resourceID, resourceData) {
        const { resources } = this.projectStore.manifestData
        const resourceEntry = resources[resourceID]
        if( resourceEntry ) {
            const ids = this.projectStore.getLocalIDs(resourceID)
            const idMap = this.idMapAuthority.commitResource(...ids)
            this.projectStore.saveResource(resourceEntry, resourceData, idMap)  
            return true  
        }
        return false
    }

    updateResource(resourceEntry) {
        const { resources } = this.projectStore.manifestData
        if( resources[resourceEntry.id] ) {
            const currentLocalID = resources[resourceEntry.id].localID
            resources[resourceEntry.id] = resourceEntry
            if( resourceEntry.localID !== currentLocalID ) {
                const parentID = this.projectStore.getParentID(resourceEntry)
                this.idMapAuthority.changeID( resourceEntry.localID, currentLocalID, parentID ) 
                this.idMapAuthority.sendIDMapUpdate()
            }
            this.projectStore.saveManifest() 
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )        
        } else {
            log.info(`Error updating resource entry: ${resourceEntry.id}`)
        }
    }

    abandonResourceMap(resourceID) {
        const ids = this.projectStore.getLocalIDs( resourceID )
        this.idMapAuthority.abandonResourceMap(...ids)
        this.idMapAuthority.sendIDMapUpdate()
    }

    openResource(resourceID) {
        if( this.remote || !this.projectStore.manifestData.resources[resourceID]) {
            this.remoteProject.openResource(resourceID)
        } else {
            this.projectStore.openResource(resourceID)
        }
    }

    resourceOpened(resourceEntry, parentEntry, resource) {
        if( !resource && !resourceEntry.local ) {
            // if this is a remote parent entry, update cache
            this.remoteParentEntries[resourceEntry.id] = resourceEntry
        } else {
            // if there's no local parent entry, look for it in cache
            const pEntry = !parentEntry && resourceEntry.parentID ? this.remoteParentEntries[resourceEntry.parentID] : parentEntry
            this.fairCopyApplication.sendToMainWindow('resourceOpened', { resourceEntry, parentEntry: pEntry, resource } )
            log.info(`opened resourceID: ${resourceEntry.id}`)    
        }
    }

    importStart(paths,options) {
        this.projectStore.importStart(paths,options)
    }

    importContinue() {
        this.projectStore.importContinue()
    }

    importEnd() {
        this.projectStore.importEnd()
        this.idMapAuthority.sendIDMapUpdate()
    }

    checkIn(email, serverURL, projectID, checkInResources, message) {
        const committedResources = []
        
        for( const resourceID of checkInResources ) {
            const resourceEntry = this.projectStore.manifestData[resourceID]
            // ignore resources that aren't in local manifest
            if( resourceEntry ) {
                const { id, local, deleted, name, localID, parentID, type } = resourceEntry
                const action = deleted ? 'destroy' : local ? 'create' : 'update'
                committedResources.push({
                    id,
                    name,
                    action,
                    localID,
                    parentID,
                    resourceType: type
                })    
            }
        }

        this.idMapAuthority.checkIn(committedResources)                
        this.projectStore.checkIn(email, serverURL, projectID, committedResources, message)
    }

    saveFairCopyConfig(fairCopyConfig) {
        this.projectStore.saveFairCopyConfig(fairCopyConfig)
    }

    exportFairCopyConfig(exportPath,fairCopyConfig) {
        this.projectStore.exportFairCopyConfig(exportPath,fairCopyConfig)
    }
    
    updateProjectInfo(projectInfo) {
        this.projectStore.updateProjectInfo(projectInfo)
    }

    requestExport(resourceIDs,path) {
        this.projectStore.requestExport(resourceIDs,path)
    }

    openImageView(imageViewInfo) {
        const { idMapNext } = this.idMapAuthority
        const idMap = JSON.stringify(idMapNext)
        this.projectStore.openImageView(imageViewInfo,idMap)
    }

}

exports.FairCopySession = FairCopySession