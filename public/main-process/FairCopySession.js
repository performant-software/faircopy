const log = require('electron-log')
const { RemoteProject } = require('./RemoteProject')
const { ProjectStore } = require('./ProjectStore')
const { createIDMapAuthority } = require('./IDMapAuthority')

class FairCopySession {

    constructor( fairCopyApplication, targetFile ) {
        this.fairCopyApplication = fairCopyApplication
        this.projectStore = new ProjectStore(fairCopyApplication)
        this.projectStore.openProject(targetFile, this.onProjectOpened )
    }

    onProjectOpened = (projectData) => {
        const { idMap } = projectData
        const { manifestData } = this.projectStore

        // id map authority tracks ids across processes and server
        this.idMapAuthority = createIDMapAuthority(manifestData.remote, idMap, (idMapData) => {
            this.fairCopyApplication.sendToAllWindows('IDMapUpdated', { idMapData } )
        })

        // init remote project if this is one
        if( manifestData.remote ) {
            const { email, serverURL, projectID } = manifestData
            this.remoteProject = new RemoteProject(this, email, serverURL, projectID )
        }

        this.fairCopyApplication.sendToMainWindow('projectOpened', projectData )
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

    addResource(resourceEntryJSON,resourceData,resourceMapJSON) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        let idMap = null
        if( resourceMapJSON ) {
            const resourceMap = JSON.parse(resourceMapJSON)
            const parentID = this.projectStore.getParentID(resourceEntry)
            idMap = this.idMapAuthority.addResource(resourceEntry.localID,parentID,resourceMap)
            if(!this.projectStore.importInProgress) this.idMapAuthority.sendIDMapUpdate()    
        }
        this.projectStore.addResource(resourceEntry,resourceData,idMap)
    }

    removeResource(resourceID) {
        const resourceEntry = this.projectStore.manifestData.resources[resourceID] 
        let idMap = null
        if( resourceEntry.type !== 'image' ) {
            const ids = this.projectStore.getLocalIDs(resourceID)
            idMap = this.idMapAuthority.removeResource(...ids)
            this.idMapAuthority.sendIDMapUpdate()    
        }
        this.projectStore.removeResource(resourceEntry,idMap)
    }

    recoverResource(resourceID) {
        this.projectStore.recoverResource(resourceID)
        if( resourceEntry.type !== 'image' ) {
            const ids = this.projectStore.getLocalIDs(resourceID)
            idMap = this.idMapAuthority.recoverResource(...ids)
            this.idMapAuthority.sendIDMapUpdate()    
        }
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

    updateResource(msgID,resourceEntryJSON) {
        const { resources } = this.projectStore.manifestData
        const resourceEntry = JSON.parse(resourceEntryJSON)
        if( resources[resourceEntry.id] ) {
            const currentLocalID = resources[resourceEntry.id].localID
            resources[resourceEntry.id] = resourceEntry
            if( resourceEntry.localID !== currentLocalID ) {
                const parentID = this.projectStore.getParentID(resourceEntry)
                this.idMapAuthority.changeID( resourceEntry.localID, currentLocalID, parentID ) 
                this.idMapAuthority.sendIDMapUpdate()
            }
            this.projectStore.saveManifest() 
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', { messageID: msgID, resourceID: resourceEntry.id, resourceEntry } )        
        } else {
            log.info(`Error updating resource entry: ${resourceEntry.id}`)
        }
    }

    abandonResourceMap(resourceID) {
        const ids = this.projectStore.getLocalIDs( resourceID )
        this.idMapAuthority.abandonResourceMap(...ids)
        this.idMapAuthority.sendIDMapUpdate()
    }

    requestResource(resourceID) {
        this.projectStore.openResource(resourceID)
    }

    requestRemoteResource(resourceID) {
        this.remoteProject.openResource(resourceID)
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

    checkIn(email, serverURL, projectID, committedResources, message) {
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