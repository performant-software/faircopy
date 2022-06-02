const { RemoteProject } = require('./RemoteProject')
const { ProjectStore } = require('./ProjectStore')

class FairCopySession {

    constructor( fairCopyApplication, targetFile ) {
        this.fairCopyApplication = fairCopyApplication
        this.remoteProject = new RemoteProject(fairCopyApplication)
        this.projectStore = new ProjectStore(fairCopyApplication)
        this.projectStore.openProject(targetFile, this.onProjectOpened )
    }

    onProjectOpened = (projectData) => {
        // this is also where we learn if this is a remote project
        this.fairCopyApplication.sendToMainWindow('projectOpened', projectData )
    }

    openImageResource(url) {
        this.projectStore.openImageResource(url)
    }

    addResource(resourceEntry,resourceData,resourceMap) {
        this.projectStore.addResource(resourceEntry,resourceData,resourceMap)
    }

    removeResource(resourceID) {
        this.projectStore.removeResource(resourceID)
    }

    recoverResource(resourceID) {
        this.projectStore.recoverResource(resourceID)
    }

    searchProject(searchQuery) {
        this.projectStore.searchIndex.searchProject(searchQuery) 
    }

    saveResource(resourceID, resourceData) {
        return this.projectStore.saveResource(resourceID, resourceData)
    }

    updateResource(resourceEntry) {
        return this.projectStore.updateResource(resourceEntry) 
    }

    onIDMapUpdated(msgID, idMap) {
        this.projectStore.onIDMapUpdated(msgID, idMap)
    }

    abandonResourceMap(resourceID) {
        this.projectStore.abandonResourceMap(resourceID)
    }

    requestResource(resourceID) {
        this.projectStore.openResource(resourceID)
    }

    importStart(paths,options) {
        this.projectStore.importStart(paths,options)
    }

    importContinue() {
        this.projectStore.importContinue()
    }

    importEnd() {
        this.projectStore.importEnd()
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
        this.projectStore.openImageView(imageViewInfo)
    }

}

exports.FairCopySession = FairCopySession