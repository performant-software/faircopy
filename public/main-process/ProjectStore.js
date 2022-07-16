const fs = require('fs')
const log = require('electron-log')
const { readFile, stat } = require('fs/promises')

const { compatibleProject, migrateConfig } = require('./data-migration')
const { SearchIndex } = require('./SearchIndex')
const { WorkerWindow } = require('./WorkerWindow')
const { exportResource } = require('./export-xml')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'
const idMapEntryName = 'id-map.json'

const maxImportFileSize = 3000000  // 3MB

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
        this.importInProgress = false
    }

    initProjectArchiveWorker( baseDir, debug, projectFilePath ) {
        this.projectArchiveWorker = new WorkerWindow( baseDir, debug, 'project-archive', (msg) => {
            const { messageType } = msg

            switch( messageType ) {
                case 'project-data': 
                    {
                        const { project } = msg
                        this.loadProject(project)   
                    }
                    break
                case 'resource-data':
                    {
                        const { resourceID, resource } = msg
                        const resourceEntry = this.manifestData.resources[resourceID]
                        const parentEntry = this.manifestData.resources[resourceEntry.parentResource]
                        this.fairCopyApplication.fairCopySession.resourceOpened( resourceEntry, parentEntry, resource )
                    }
                    break
                case 'index-resource':
                    {
                        const { resourceID, resource } = msg
                        const resourceEntry = this.manifestData.resources[resourceID]
                        this.searchIndex.indexResource( resourceID, resourceEntry.type, resource )  
                    }
                    break
                case 'export-resource':
                    {
                        const { resourceData, error, path } = msg
                        if( error ) {
                            // TODO send back error message
                        } else {
                            exportResource(resourceData, path)
                        }
                    }
                    break
                case 'cache-file-name':
                    {
                        const { cacheFile } = msg
                        if( cacheFile ) this.fairCopyApplication.localFileProtocolCallback(decodeURIComponent(cacheFile))
                    }
                    break
                case 'image-view-ready':
                    {
                        const { resourceID, imageViewData } = msg
                        // mix in remote project data if needed
                        if( this.manifestData.remote ) {
                            const { email, serverURL } = this.manifestData
                            imageViewData.email = email
                            imageViewData.serverURL = serverURL
                            imageViewData.remote = true
                        }
                        const imageView = this.fairCopyApplication.imageViews[resourceID]
                        imageView.webContents.send('imageViewOpened', imageViewData )    
                    }
                    break
                case 'check-in-results':
                    {
                        const { resourceIDs, error } = msg
                        this.switchToRemote(resourceIDs)
                        this.fairCopyApplication.sendToMainWindow('checkInResults', resourceIDs, error ) 
                        if( !error ) this.fairCopyApplication.fairCopySession.requestResourceView()           
                    }
                    break
                case 'check-out-results':
                    {
                        const { resources, error } = msg
                        this.fairCopyApplication.sendToMainWindow('checkOutResults', Object.keys(resources), error ) 
                        for( const resource of Object.values(resources) ) {
                            const { resourceEntry, parentEntry, content } = resource
                            this.manifestData.resources[resourceEntry.id] = resourceEntry
                            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )   
                            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', parentEntry )   
                            this.fairCopyApplication.sendToAllWindows('resourceContentUpdated', resourceEntry.id, 'check-out-messsage', content ) 
                            this.saveManifest()      
                        }
                    }
                    break
                default:
                    throw new Error(`Unrecognized message type ${messageType} received from project archive: ${JSON.stringify(msg)}`)
            }
        })
        
        return this.projectArchiveWorker.start({ projectFilePath, manifestEntryName, configSettingsEntryName, idMapEntryName })
    }

    openProject(projectFilePath, onProjectOpened) {
        const {baseDir} = this.fairCopyApplication
        this.onProjectOpened = onProjectOpened
        const debug = this.fairCopyApplication.isDebugMode()
        this.initProjectArchiveWorker( baseDir, debug, projectFilePath ).then(() => {
            this.projectArchiveWorker.postMessage({ messageType: 'open' })
        })
    }

    loadProject(project) {
        const { baseDir } = this.fairCopyApplication
        
        if( !project ) {
            log.error('Attempted to open invalid project file.')
            return
        }
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        const baseConfig = fs.readFileSync(`${baseDir}/config/faircopy-config.json`).toString('utf-8')

        if( !teiSchema || !baseConfig ) {
            log.info('Application data is missing or corrupted.')
            return
        }

        let { fairCopyManifest, fairCopyConfig, idMap, projectFilePath } = project

        if( !fairCopyManifest || !fairCopyConfig || !idMap ) {
            log.info('Project file is missing required entries.')
            return
        }

        // project store keeps a copy of the manifest data
        this.manifestData = JSON.parse(fairCopyManifest)
        if( !this.manifestData ) {
            log.info('Error parsing project manifest.')
            return
        }

        const currentVersion = this.fairCopyApplication.config.version
        if( !this.fairCopyApplication.isDebugMode() && !compatibleProject(this.manifestData, currentVersion) ) {
            log.info('Project file is incompatible.')
            const incompatInfo = { projectFilePath, projectFileVersion: this.manifestData.generatedWith }
            this.fairCopyApplication.sendToMainWindow('projectIncompatible', incompatInfo)
            return
        }
        
        // if elements changed in config, migrate project config
        this.migratedConfig = migrateConfig(this.manifestData.generatedWith,baseConfig,fairCopyConfig)
        fairCopyConfig = this.migratedConfig

        // setup search index if local 
        if( !this.manifestData.remote ) {
            this.searchIndex = new SearchIndex( teiSchema, this, (status) => {
                this.fairCopyApplication.sendToMainWindow('searchSystemStatus', status )
            })    
        }

        const projectData = { projectFilePath, fairCopyManifest, teiSchema, fairCopyConfig, baseConfig, idMap }
        this.onProjectOpened( projectData )
    }

    openImageView(imageViewInfo, idMap) {
        const { resourceID, xmlID, parentID } = imageViewInfo
        const { baseDir } = this.fairCopyApplication
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')

        const resourceEntry = this.manifestData.resources[resourceID]
        const parentEntry = this.manifestData.resources[parentID]
        if( resourceEntry ) {
            const imageViewData = { resourceEntry, parentEntry, xmlID, teiSchema, idMap }
            this.projectArchiveWorker.postMessage({ messageType: 'open-image-view', resourceID, imageViewData })
        }
    }

    async importStart(paths,options) {
        this.importRunning(true)
        const importList = []
        for( const path of paths ) {
            const stats = await stat(path)
            if( stats.size <= maxImportFileSize ) {
                const data = await readFile(path, { encoding: 'utf-8'} )
                importList.push({ path, data, options })    
            } else {
                importList.push({ path, error: 'too-big'})
            }
        }
        const importData = { command: 'start', importList }
        this.fairCopyApplication.sendToMainWindow('importData', importData )  
        this.importContinue()
    }

    importContinue() {
        this.fairCopyApplication.sendToMainWindow('importData', { command: 'next' } )  
    }

    importEnd() {
        this.importRunning(false)
        this.saveManifest()
    }

    importRunning(running) {
        this.importInProgress = running
    }

    requestExport(resourceEntries,path) {
        const { resources: localEntries, remote, email, serverURL, projectID } = this.manifestData
        const projectData = { localEntries, remote, email, serverURL, projectID }
        for( const resourceEntry of resourceEntries ) {
            this.projectArchiveWorker.postMessage({ messageType: 'request-export', resourceEntry, projectData, path })
        }
    }

    close() {
        this.projectArchiveWorker.postMessage({ messageType: 'close' })
        if( this.searchIndex ) this.searchIndex.close()
    }

    saveResource(resourceEntry, resourceData, idMap) {
        const { id, type } = resourceEntry
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })
        this.projectArchiveWorker.postMessage({ messageType: 'write-resource', resourceID: id, data: resourceData })
        if( this.searchIndex ) this.searchIndex.indexResource(id, type, resourceData )
        this.save()
    }

    requestIndex( resourceID ) {
        this.projectArchiveWorker.postMessage({ messageType: 'request-index', resourceID })
    }

    addResource( resourceEntry, resourceData, idMap ) {
        this.manifestData.resources[resourceEntry.id] = resourceEntry
        if( resourceEntry.type === 'image' )  {
            this.projectArchiveWorker.postMessage({ messageType: 'add-local-file', resourceID: resourceEntry.id, localFilePath: resourceData })
        } else {
            if( idMap ) {
                this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })
            }
            this.projectArchiveWorker.postMessage({ messageType: 'write-resource', resourceID: resourceEntry.id, data: resourceData })
            if( this.searchIndex ) this.searchIndex.indexResource(resourceEntry.id, resourceEntry.type, resourceData )
        }

        if(this.importInProgress) {
            this.importContinue()
        } else {
            this.saveManifest()
            this.fairCopyApplication.fairCopySession.requestResourceView()
        }
    }
    
    removeResource(resourceID,idMap) {
        const resourceEntry = this.manifestData.resources[resourceID]
        
        // go through the manifest entries, if there are local images associated with this facs, delete them too
        if( resourceEntry.type === 'facs' ) {
            for( const entry of Object.values(this.manifestData.resources) ) {
                const {id, type, localID} = entry
                if( type === 'image' && localID.startsWith(resourceID) ) {
                    delete this.manifestData.resources[id] 
                    this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: id })    
                    log.info(`Removed image resource from project: ${id}`)
                }
            }
        } else {
            // remove associated search index
            if( this.searchIndex ) this.searchIndex.removeIndex(resourceID)
        }

        if( idMap ) {
            this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })  
        }

        if( resourceEntry.local ) {
            delete this.manifestData.resources[resourceID] 
            this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: resourceID })        
        } else {
            resourceEntry.deleted = true
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry  )
        }

        log.info(`Removed resource from project: ${resourceID}`)
        this.saveManifest()
        this.fairCopyApplication.fairCopySession.requestResourceView()
    }

    recoverResource( resourceID ) {
        const resourceEntry = this.manifestData.resources[resourceID] 

        if( resourceEntry ) {
            resourceEntry.deleted = false
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry  )
            this.saveManifest()
        }
    }

    saveManifest() {
        const currentVersion = this.fairCopyApplication.config.version
        this.manifestData.generatedWith = currentVersion
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: manifestEntryName, data: JSON.stringify(this.manifestData) })
        this.save()
    }

    saveIDMap(idMap) {
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })
    }

    saveFairCopyConfig( fairCopyConfig ) {
        this.migratedConfig = null
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: configSettingsEntryName, data: fairCopyConfig })
        this.saveManifest()
    }

    save() {
        // if there was a migration that hasn't been saved yet, save it now
        if( this.migratedConfig ) {
            this.saveFairCopyConfig( this.migratedConfig ) 
        } else {
            this.projectArchiveWorker.postMessage({ messageType: 'save' })
        }
    }

    exportFairCopyConfig( exportPath, fairCopyConfigJSONCompact ) {
        try {
            const fairCopyConfig = JSON.parse(fairCopyConfigJSONCompact)
            const fairCopyConfigJSON = JSON.stringify(fairCopyConfig, null, '\t')
            fs.writeFileSync(exportPath,fairCopyConfigJSON)    
            log.info(`Exported project config to: ${exportPath}`)
        } catch(e) {
            log.error(`Error exporting project config: ${e}`)
        }
    }

    updateProjectInfo(projectInfoJSON) {
        const projectInfo = JSON.parse(projectInfoJSON)
        const { name, description } = projectInfo
        this.manifestData.projectName = name
        this.manifestData.description = description    
        this.saveManifest()
    }

    checkIn(email, serverURL, projectID, committedResources, message) {
        this.projectArchiveWorker.postMessage({ messageType: 'check-in', email, serverURL, projectID, committedResources, message })
    }

    checkOut(email, serverURL, projectID, resourceIDs ) {
        this.projectArchiveWorker.postMessage({ messageType: 'check-out', email, serverURL, projectID, resourceIDs })
    }

    openImageResource(requestURL) {
        const resourceID = requestURL.replace(`local://`, '').replace('..','')
        const resourceEntry = this.manifestData.resources[resourceID]

        if( resourceEntry ) {
            // create a file path to the temp dir
            const ext = getExtensionForMIMEType(resourceEntry.mimeType)
            const fileName = `${resourceID}.${ext}`
            this.projectArchiveWorker.postMessage({ messageType: 'cache-resource', resourceID, fileName })
        }    
    }

    openResource(resourceID) {
        const resourceEntry = this.manifestData.resources[resourceID]
        if( resourceEntry ) {
            this.projectArchiveWorker.postMessage({ messageType: 'read-resource', resourceID })
        }
    }

    switchToRemote(resourceIDs) {
        const { email } = this.manifestData
        // remove remote resources from project file and manifest, update all windows 
        for( const resourceID of resourceIDs ) {
            this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: resourceID })   
            const resourceEntry = this.manifestData.resources[resourceID]
            resourceEntry.local = false
            resourceEntry.lastAction = { action_type: 'check_in', user: { email } }
            this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )
            delete this.manifestData.resources[resourceID] 
        }
        this.saveManifest()
    }

    getCheckedOutResources() {
        const resourceEntries = Object.values( this.manifestData.resources )

        const checkedOutResources = {}
        for( const resourceEntry of resourceEntries ) {
            if( resourceEntry.type !== 'image') {
                checkedOutResources[resourceEntry.id] = resourceEntry
            }
        }
        return checkedOutResources
    }
}

function getExtensionForMIMEType( mimeType ) {
    switch(mimeType) {
        case 'image/png':
            return 'png'
        case 'image/jpeg':
            return 'jpg'
        case 'image/gif':
            return 'gif' 
        default:
            throw new Error(`Unknown MIMEType: ${mimeType}`)
    }        
}

exports.ProjectStore = ProjectStore
exports.manifestEntryName = manifestEntryName
exports.configSettingsEntryName = configSettingsEntryName
exports.idMapEntryName = idMapEntryName