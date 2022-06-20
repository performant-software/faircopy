const log = require('electron-log')
const { RemoteProject } = require('./RemoteProject')
const { ProjectStore } = require('./ProjectStore')
const { IDMapAuthority } = require('./IDMapAuthority')

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
        this.idMapAuthority = new IDMapAuthority(idMap, manifestData.resources, this.fairCopyApplication)

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
            idMap = this.idMapAuthority.addResource(resourceEntry,resourceMap)
            if(!this.projectStore.importInProgress) this.idMapAuthority.sendIDMapUpdate()    
        }
        this.projectStore.addResource(resourceEntry,resourceData,idMap)
    }

    removeResource(resourceID) {
        const resourceEntry = this.projectStore.manifestData.resources[resourceID] 
        let idMap = null
        if( resourceEntry.type !== 'image' ) {
            idMap = this.idMapAuthority.removeResource(resourceID)
            this.idMapAuthority.sendIDMapUpdate()    
        }
        this.projectStore.removeResource(resourceEntry,idMap)
    }

    recoverResource(resourceID) {
        this.projectStore.recoverResource(resourceID)
    }

    searchProject(searchQuery) {
        this.projectStore.searchIndex.searchProject(searchQuery) 
    }

    saveResource(resourceID, resourceData) {
        const { resources } = this.projectStore.manifestData
        const resourceEntry = resources[resourceID]
        if( resourceEntry ) {
            const idMap = this.idMapAuthority.commitResource(resourceID)
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
                this.idMapAuthority.changeID( resourceEntry.localID, resourceEntry.id ) 
                this.idMapAuthority.sendIDMapUpdate()
            }
            this.projectStore.saveManifest() 
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', { messageID: msgID, resourceID: resourceEntry.id, resourceEntry } )        
        } else {
            log.info(`Error updating resource entry: ${resourceEntry.id}`)
        }
    }

    abandonResourceMap(resourceID) {
        this.idMapAuthority.abandonResourceMap(resourceID)
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