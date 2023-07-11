const fs = require('fs')

const log = require('electron-log')
const { RemoteProject } = require('./RemoteProject')
const { ProjectStore } = require('./ProjectStore')
const { createIDMapAuthority } = require('./IDMapAuthority')

const initialRowsPerPage = 50

class FairCopySession {

    constructor( fairCopyApplication, targetFile ) {
        this.fairCopyApplication = fairCopyApplication
        this.projectStore = new ProjectStore(fairCopyApplication)
        this.projectStore.openProject(targetFile, this.onProjectOpened )
        this.remote = false
        this.resourceViews = {
            currentView: 'home',
            remote: { 
                indexParentID: null,
                parentEntry: null,
                currentPage: 1, 
                rowsPerPage: initialRowsPerPage,
                totalRows: 0,
                loading: true
            },
            home: {
                indexParentID: null,
                parentEntry: null,
                currentPage: 1, 
                rowsPerPage: initialRowsPerPage,
                totalRows: 0,
                loading: true           
            }
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
            const { userID, serverURL, projectID } = manifestData
            this.remoteProject = new RemoteProject(this, userID, serverURL, projectID )
        }

        this.requestResourceView()
    }

    closeProject() {
        this.projectStore.close()
        if( this.remoteProject ) this.remoteProject.close()
    }

    reopenProject() {
        this.remoteProject.open()
        this.requestResourceView()
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
            
            this.idMapAuthority.sendIDMapUpdate()    
        }
        this.projectStore.addResource(resourceEntry,resourceData,idMap)
    }

    removeResources(resourceIDs) {
        const { resources } = this.projectStore.manifestData
        // use this map to generate unique ID list
        const doomedIDMap = {} 

        for( const resourceID of resourceIDs ) {
            const resourceEntry = resources[resourceID]
            if( resourceEntry ) {
                if( resourceEntry.type === 'teidoc') {
                    // also delete any checked out children 
                    for( const localResource of Object.values(resources) ) {
                        const { parentResource } = localResource
                        if( localResource.type !== 'image' && parentResource === resourceEntry.id ) {
                            doomedIDMap[localResource.id] = true                  
                        }                    
                    }
                }
                doomedIDMap[resourceEntry.id] = true
            } else {
                log.info(`Error removing resource entry: ${resourceID}`)
            }
        }

        const doomedIDs = Object.keys(doomedIDMap)
        const idMap = this.idMapAuthority.removeResources(doomedIDs)
        this.projectStore.removeResources(doomedIDs,idMap)   
        this.requestResourceView()
    }

    recoverResources(resourceIDs) {
        const { resources } = this.projectStore.manifestData
        const recoveredIDMap = {}

        for( const resourceID of resourceIDs ) {
            const resourceEntry = resources[resourceID]
            if( resourceEntry && resourceEntry.deleted ) {
                // also recover any checked out children 
                if( resourceEntry.type === 'teidoc') {
                    for( const localResource of Object.values(resources) ) {
                        const { parentResource } = localResource
                        if( localResource.type !== 'image' && parentResource === resourceEntry.id ) {
                            recoveredIDMap[localResource.id] = true                  
                        }                    
                    }
                }
                recoveredIDMap[resourceEntry.id] = true
            } else {
                log.info(`Error recovering resource entry: ${resourceID}`)
            }    
        }

        const recoveredIDs = Object.keys(recoveredIDMap)
        if( recoveredIDs.length > 0 ) {
            const idMap = this.idMapAuthority.recoverResources(recoveredIDs)
            this.projectStore.recoverResources(recoveredIDs,idMap)
            this.requestResourceView()    
        }
    }

    updateResourceView(resourceViewRequest) {
        const { currentView, indexParentID, parentEntry, currentPage }  = resourceViewRequest
        const resourceView = this.resourceViews[currentView]
        this.resourceViews[currentView] = { ...resourceView, indexParentID, parentEntry, currentPage }
        this.resourceViews.currentView = currentView
        this.requestResourceView()
    }

    requestResourceView() {
        const {currentView} = this.resourceViews
        const resourceView = this.resourceViews[currentView]
        const { indexParentID, currentPage, rowsPerPage } = resourceView
        const { resources: localResources } = this.projectStore.manifestData

        if( currentView === 'remote' ) {
            // request resource data from server
            this.remoteProject.requestResourceView(resourceView)
        } else {
            // respond right away from project store
            resourceView.parentEntry = indexParentID ? localResources[indexParentID] : null

            let resourceIndex = []
            for( const localResource of Object.values(localResources) ) {
                const { parentResource } = localResource
                if( localResource.type !== 'image' ) {
                    if( parentResource === indexParentID ||
                        ( indexParentID === null && !localResources[parentResource] )) {
                        // if this resource is a child of current parent OR 
                        // if the parent is not checked out, display it at top level
                        resourceIndex.push(localResource)                    
                    } 
                }                    
            }
            // don't let currentPage be > page count 
            let pageCount = Math.ceil(resourceIndex.length/rowsPerPage)
            pageCount = pageCount === 0 ? 1 : pageCount
            const nextPage = currentPage > pageCount ? pageCount : currentPage
            const start = rowsPerPage * (nextPage-1)
            const end = start + rowsPerPage
            resourceView.totalRows = resourceIndex.length
            resourceView.currentPage = nextPage
            resourceView.loading = false
            this.resourceViews[currentView] = resourceView
            resourceIndex = resourceIndex.slice(start,end)

            this.fairCopyApplication.sendToAllWindows('resourceViewUpdate', { resourceViews: this.resourceViews, resourceIndex } )
        }
    }

    requestLocalResources() {
        const localResources = this.projectStore.getLocalResources()
        this.fairCopyApplication.sendToMainWindow('localResources', localResources )
    }

    sendResourceViewUpdate(resourceView, remoteResources) {
        const { resources: localResources } = this.projectStore.manifestData
        const { indexParentID, rowsPerPage, currentPage, totalRows } = resourceView

        // if parent isn't in remote response, must be local parent
        if( indexParentID !== null && !resourceView.parentEntry ) {
            resourceView.parentEntry = localResources[indexParentID]
        }

        const resourceIndex = remoteResources.map( resourceEntry => {
            return localResources[resourceEntry.id] ? localResources[resourceEntry.id] : resourceEntry
        })

        // don't let currentPage be > page count 
        let pageCount = Math.ceil(totalRows/rowsPerPage)
        pageCount = pageCount === 0 ? 1 : pageCount
        resourceView.currentPage = currentPage > pageCount ? pageCount : currentPage
        
        this.resourceViews.remote = resourceView
        this.fairCopyApplication.sendToAllWindows('resourceViewUpdate', { resourceViews: this.resourceViews, resourceIndex })
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
            const currentParentID = resources[resourceEntry.id].parentResource
            resources[resourceEntry.id] = resourceEntry

            let idMap = null 
            if( resourceEntry.parentResource !== currentParentID ) {
                idMap = this.idMapAuthority.moveResourceMap( resourceEntry.localID, currentLocalID, resourceEntry.parentResource, currentParentID ) 
            }
            if( resourceEntry.localID !== currentLocalID ) {
                if( resourceEntry.parentResource ) {
                    const { localID: parentID } = this.idMapAuthority.getLocalIDs(resourceEntry.parentResource)
                    idMap = this.idMapAuthority.changeID( resourceEntry.localID, currentLocalID, parentID ) 
                } else {
                    idMap = this.idMapAuthority.changeID( resourceEntry.localID, currentLocalID, null )     
                }
            }

            if( idMap ) {
                this.projectStore.saveIDMap(idMap)
                this.idMapAuthority.sendIDMapUpdate()    
            }
            this.projectStore.saveManifest() 
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )  
            this.requestResourceView()      
        } else {
            log.info(`Error updating resource entry: ${resourceEntry.id}`)
        }
    }

    abandonResourceMap(resourceID) {
        const { localID, parentID } = this.idMapAuthority.getLocalIDs( resourceID )
        this.idMapAuthority.abandonResourceMap(localID,parentID)
        this.idMapAuthority.sendIDMapUpdate()
    }

    openResource(resourceID, xmlID=null ) {
        if( this.remote && !this.projectStore.manifestData.resources[resourceID]) {
            this.remoteProject.openResource(resourceID, xmlID)
        } else {
            this.projectStore.openResource(resourceID, xmlID)
        }
    }

    resourceOpened(resourceEntry, parentEntry, resource, xmlID) {
        if( this.remote && !parentEntry && resourceEntry.parentResource ) {
            // parent is remote and resourceEntry is local or checked out
            // go lookup the parent entry to complete this payload
            this.remoteProject.getParentEntry(resourceEntry, resource, xmlID)
        } else {
            if( xmlID ) {
                // at the moment, only image views use xmlID
                this.openImageView( { xmlID, resourceEntry, parentEntry, resource } )
            } else {
                this.fairCopyApplication.sendToMainWindow('resourceOpened', { resourceEntry, parentEntry, resource } )
                log.info(`opened resourceID: ${resourceEntry.id}`)            
            }
        }
    }

    // parent found, send complete resourceOpened message
    parentFound(resourceEntry, parentEntry, resource, xmlID) {
        if( xmlID ) {
            this.openImageView( { xmlID, resourceEntry, parentEntry, resource } )
        } else {
            this.fairCopyApplication.sendToMainWindow('resourceOpened', { resourceEntry, parentEntry, resource } )
            log.info(`got parent, opened resourceID: ${resourceEntry.id}`)            
        }
    }

    openImageView( resourceData ) {
        const { resourceEntry } = resourceData
        const imageViewData = { ...resourceData }

        const { baseDir } = this.fairCopyApplication
        imageViewData.teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        imageViewData.idMap = JSON.stringify(this.idMapAuthority.idMap)

         // mix in remote project data if needed
         if( this.remote ) {
            const { userID, serverURL, permissions } = this.projectStore.manifestData
            imageViewData.userID = userID
            imageViewData.serverURL = serverURL
            imageViewData.remote = true
            imageViewData.permissions = permissions
        }
        const imageView = this.fairCopyApplication.imageViews[resourceEntry.id]
        imageView.webContents.send('imageViewOpened', imageViewData )    
    }

    importStart(paths,options) {
        this.projectStore.importStart(paths,options)
    }

    importIIIFStart(importList) {
        this.projectStore.importIIIFStart(importList)
    }

    importContinue() {
        this.projectStore.importContinue()
    }

    importEnd() {
        this.projectStore.importEnd()
        this.idMapAuthority.sendIDMapUpdate()
    }

    checkIn(userID, serverURL, projectID, checkInResources, message) {
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
                resourceMap: resourceMap?.ids,
                resourceType: type
            }
        }
        
        const homeParentID = this.resourceViews.home.indexParentID
        for( const resourceID of checkInResources ) {
            const resourceEntry = resources[resourceID]
            // ignore resources that aren't in local manifest
            if( resourceEntry ) {
                const resourceCommitEntry = createCommitEntry(resourceEntry)
                committedResources.push(resourceCommitEntry)
            }
            if( resourceID === homeParentID ) {
                // if this got checked in, move to root
                this.resourceViews.home.indexParentID = null
            }
        }

        this.projectStore.checkIn(userID, serverURL, projectID, committedResources, message)
    }

    checkOut(userID, serverURL, projectID, resourceEntries) {
        this.projectStore.checkOut(userID, serverURL, projectID, resourceEntries)
    }

    saveFairCopyConfig(fairCopyConfig, lastAction) {
        this.projectStore.saveFairCopyConfig(fairCopyConfig, lastAction)
    }

    checkInConfig(fairCopyConfig, firstAction) {
        this.projectStore.saveFairCopyConfig(fairCopyConfig)
        this.remoteProject.checkInConfig(fairCopyConfig, firstAction)
    }

    checkOutConfig() {
        this.remoteProject.checkOutConfig()
    }    

    exportFairCopyConfig(exportPath,fairCopyConfig) {
        this.projectStore.exportFairCopyConfig(exportPath,fairCopyConfig)
    }
    
    updateProjectInfo(projectInfo) {
        this.projectStore.updateProjectInfo(projectInfo)
        // TODO if this is a remote project, send the latest name and description to server
        // permissions etc can only be set from server.
    }

    requestExport(resourceEntries,path) {
        this.projectStore.requestExport(resourceEntries,path)
    }
}

exports.FairCopySession = FairCopySession