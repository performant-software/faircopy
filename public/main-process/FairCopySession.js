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
            parentEntry: null,
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
            const { parentResource } = resource
            // if we don't have this entry, request it from server
            if( !localResources[parentResource] && !this.remoteParentEntries[parentResource] ) {
                this.openResource(parentResource)          
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
            const { localID } = resourceEntry
            if( resourceEntry.parentResource ) {
                const { localID: parentID } = this.idMapAuthority.getLocalIDs(resourceEntry.parentResource)
                idMap = this.idMapAuthority.addResource(localID,parentID,resourceMap)
            } else {
                idMap = this.idMapAuthority.addResource(localID,null,resourceMap)
            }
            
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
                const { localID, parentID } = this.idMapAuthority.getLocalIDs(resourceID)
                idMap = this.idMapAuthority.removeResource(localID, parentID)
                this.idMapAuthority.sendIDMapUpdate()    
            }
            this.projectStore.removeResource(resourceID,idMap)    
        } else {
            log.info(`Error removing resource entry: ${resourceID}`)
        }
    }

    recoverResource(resourceID) {
        this.projectStore.recoverResource(resourceID)
        const { localID, parentID } = this.idMapAuthority.getLocalIDs(resourceID)
        this.idMapAuthority.recoverResource(localID,parentID)
        this.idMapAuthority.sendIDMapUpdate()
    }

    requestResourceView(nextResourceView=null) {
        if( this.remote ) {
            // request resource data from server
            const resourceView = nextResourceView ? nextResourceView : this.resourceView
            this.remoteProject.requestResourceView(resourceView)
        } else {
            // respond right away from project store
            this.resourceView = nextResourceView ? nextResourceView : this.resourceView
            const { resources: localResources } = this.projectStore.manifestData
            const { indexParentID } = this.resourceView
            const resourceIndex = []

            for( const localResource of Object.values(localResources) ) {
                if( localResource.parentResource === indexParentID && localResource.type !== 'image' ) {
                    resourceIndex.push(localResource)
                }
            }
            // TODO sort and only return current page
            this.fairCopyApplication.sendToAllWindows('resourceViewUpdate', this.resourceView, resourceIndex )
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
        const { resources: localResources } = this.projectStore.manifestData
        const resourceIndex = []
        const { indexParentID } = resourceView

        // if parent isn't in remote response, must be local parent
        if( indexParentID !== null && !resourceView.parentEntry ) {
            resourceView.parentEntry = localResources[indexParentID]
        }

        for( const localResource of Object.values(localResources) ) {
            if( localResource.parentResource === indexParentID && localResource.type !== 'image' ) {
                resourceIndex.push(localResource)
            }
        }

        for( const remoteResource of remoteResources ) {
            // if we have a local entry, don't add remote entry
            if( !localResources[remoteResource.id] ) {
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
            const { localID, parentID } = this.idMapAuthority.getLocalIDs(resourceID)
            const idMap = this.idMapAuthority.commitResource(localID, parentID)
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
            // change local ID
            if( resourceEntry.localID !== currentLocalID ) {
                let idMap = null
                if( resourceEntry.parentResource ) {
                    const { localID: parentID } = this.idMapAuthority.getLocalIDs(resourceEntry.parentResource)
                    idMap = this.idMapAuthority.changeID( resourceEntry.localID, currentLocalID, parentID ) 
                } else {
                    idMap = this.idMapAuthority.changeID( resourceEntry.localID, currentLocalID, null )     
                }
                this.projectStore.saveIDMap(idMap)
                this.idMapAuthority.sendIDMapUpdate()
            }
            this.projectStore.saveManifest() 
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )        
        } else {
            log.info(`Error updating resource entry: ${resourceEntry.id}`)
        }
    }

    abandonResourceMap(resourceID) {
        const { localID, parentID } = this.idMapAuthority.getLocalIDs( resourceID )
        this.idMapAuthority.abandonResourceMap(localID,parentID)
        this.idMapAuthority.sendIDMapUpdate()
    }

    openResource(resourceID) {
        if( this.remote && !this.projectStore.manifestData.resources[resourceID]) {
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
            const pEntry = !parentEntry && resourceEntry.parentResource ? this.remoteParentEntries[resourceEntry.parentResource] : parentEntry
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
        const { resources } = this.projectStore.manifestData
        const committedResources = []

        const createCommitEntry = ( resourceEntry ) => {
            const { id, local, deleted, name, localID, parentResource: parentID, type } = resourceEntry
            const resourceMap = !deleted ? this.idMapAuthority.getResourceMap(id) : null
            const action = deleted ? 'destroy' : local ? 'create' : 'update'
            return {
                id,
                name,
                action,
                localID,
                parentID,
                resourceMap,
                resourceType: type
            }
        }
        
        for( const resourceID of checkInResources ) {
            const resourceEntry = resources[resourceID]
            // ignore resources that aren't in local manifest
            if( resourceEntry ) {
                committedResources.push(createCommitEntry(resourceEntry))

                // automatically add header if teidoc  
                if( resourceEntry.type === 'teidoc' ) {
                    const headerEntry = Object.values(resources).find( r => (r.parentResource === resourceEntry.id && r.type === 'header') )
                    committedResources.push(createCommitEntry(headerEntry))
                }
            }
        }

        this.idMapAuthority.checkIn(committedResources)                
        this.projectStore.checkIn(email, serverURL, projectID, committedResources, message)
    }

    checkOut(email, serverURL, projectID, resourceIDs) {
        this.idMapAuthority.checkOut(resourceIDs)                
        this.projectStore.checkOut(email, serverURL, projectID, resourceIDs)
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

    requestExport(resourceEntries,path) {
        this.projectStore.requestExport(resourceEntries,path)
    }

    openImageView(imageViewInfo) {
        const { idMapNext } = this.idMapAuthority
        const idMap = JSON.stringify(idMapNext)
        this.projectStore.openImageView(imageViewInfo,idMap)
    }

}

exports.FairCopySession = FairCopySession