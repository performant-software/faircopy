const fs = require('fs')

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
        this.resourceView = { 
            indexParentID: null,
            parentEntry: null,
            currentPage: 1, 
            rowsPerPage: 100,
            totalRows: null,
            loading: true
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
            
            this.idMapAuthority.sendIDMapUpdate()    
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
        this.idMapAuthority.recoverResource(resourceID)
        this.idMapAuthority.sendIDMapUpdate()
        this.requestResourceView()
    }

    requestResourceView(nextResourceView=null) {
        const resourceView = nextResourceView ? nextResourceView : this.resourceView
        const { indexParentID, currentPage, rowsPerPage } = resourceView
        const { resources: localResources } = this.projectStore.manifestData
        const hasLocalParent = indexParentID && localResources[indexParentID]?.local

        if( this.remote && !hasLocalParent ) {
            // request resource data from server
            this.remoteProject.requestResourceView(resourceView)
        } else {
            // respond right away from project store
            resourceView.parentEntry = indexParentID ? localResources[indexParentID] : null
            this.resourceView = resourceView           

            let resourceIndex = []
            for( const localResource of Object.values(localResources) ) {
                if( localResource.parentResource === indexParentID && localResource.type !== 'image' ) {
                    resourceIndex.push(localResource)
                }
            }
            const start = rowsPerPage * (currentPage-1)
            const end = start + rowsPerPage
            this.resourceView.totalRows = resourceIndex.length
            resourceIndex = resourceIndex.slice(start,end)
            this.resourceView.loading = false

            this.fairCopyApplication.sendToAllWindows('resourceViewUpdate', { resourceView: this.resourceView, resourceIndex } )
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
        let resourceIndex = []
        const { indexParentID, rowsPerPage, currentPage } = resourceView

        // if parent isn't in remote response, must be local parent
        if( indexParentID !== null && !resourceView.parentEntry ) {
            resourceView.parentEntry = localResources[indexParentID]
        }
        
        let localCount = 0
        for( const localResource of Object.values(localResources) ) {
            if( localResource.parentResource === indexParentID && localResource.type !== 'image' ) {
                // local resources only appear on 1st page.
                if( currentPage === 1 ) {
                    resourceIndex.push(localResource) 
                } 
                localCount++
            }
        }

        for( const remoteResource of remoteResources ) {
            // if we have a local entry, don't add remote entry
            if( !localResources[remoteResource.id] ) {
                resourceIndex.push(remoteResource)
            } else {
                // don't count these twice
                localCount--
            }
        }
        this.resourceView = resourceView

        // the first page has all the local resources on it, so it might have more rows
        const start = rowsPerPage * (currentPage-1)
        const end = currentPage !== 1 ? start + rowsPerPage : rowsPerPage + localCount
        this.resourceView.totalRows = this.resourceView.totalRows + localCount
        resourceIndex = resourceIndex.slice(start,end)

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
        imageViewData.idMap = this.idMapAuthority.idMap

         // mix in remote project data if needed
         if( this.remote ) {
            const { email, serverURL } = this.projectStore.manifestData
            imageViewData.email = email
            imageViewData.serverURL = serverURL
            imageViewData.remote = true
        }
        const imageView = this.fairCopyApplication.imageViews[resourceEntry.id]
        imageView.webContents.send('imageViewOpened', imageViewData )    
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
                resourceMap: resourceMap?.ids,
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
                    if( resourceEntry.deleted ) headerEntry.deleted = true
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
}

exports.FairCopySession = FairCopySession