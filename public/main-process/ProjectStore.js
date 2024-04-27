const fs = require('fs')
const log = require('electron-log')
const { readFile, stat } = require('fs/promises')
const { app } = require('electron')

const { compatibleProject, migrateConfig, migrateIDMap, migrateManifestData } = require('./data-migration')
const { SearchIndex } = require('./SearchIndex')
const { WorkerWindow } = require('./WorkerWindow')

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
                        const { resourceID, xmlID, resource } = msg
                        const resourceEntry = this.manifestData.resources[resourceID]
                        const parentEntry = this.manifestData.resources[resourceEntry.parentResource]
                        this.fairCopyApplication.fairCopySession.resourceOpened( resourceEntry, parentEntry, resource, xmlID )
                    }
                    break
                case 'index-resource':
                    {
                        const { resourceID, resource } = msg
                        const resourceEntry = this.manifestData.resources[resourceID]
                        this.searchIndex.indexResource( resourceID, resourceEntry.type, resource )  
                    }
                    break
                case 'exported-resource':
                    {
                        const { error, path } = msg
                        if( error ) {
                            log.info(`Error exporting resources to: ${path} ${error}`)
                        } else {
                            log.info(`Exported resources to: ${path}`)
                        }
                    }
                    break
                case 'preview-resource':
                    {
                        const { previewData, error } = msg
                        if( error ) {
                            log.info(`Error previewing resource: ${error}`)
                        } else {
                            this.fairCopyApplication.openPreview(previewData)
                        }
                    }
                    break  
                case 'editioncrafter-data':
                    {
                        const { url } = msg
                        const callback = editionCrafterCallbacks[url]
                        callback(msg)
                    }
                    break
                case 'cache-file-name':
                    {
                        const { cacheFile } = msg
                        if( cacheFile ) this.fairCopyApplication.localFileProtocolCallback(decodeURIComponent(cacheFile))
                    }
                    break
                case 'check-in-results':
                    {
                        const { resourceStatus, error } = msg
                        this.checkInResults(resourceStatus, error)
                    }
                    break
                case 'check-out-results':
                    {
                        const { resources, error } = msg
                        this.checkOutResults(resources,error)
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
        const debug = !app.isPackaged
        this.initProjectArchiveWorker( baseDir, debug, projectFilePath ).then(() => {
            this.projectArchiveWorker.postMessage({ messageType: 'open' })
        })
    }

    loadProject(project) {
        const { baseDir, config: fairCopyAppConfig } = this.fairCopyApplication
        
        if( !project ) {
            log.error('Attempted to open invalid project file.')
            return
        }
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        const baseConfigJSON = fs.readFileSync(`${baseDir}/config/faircopy-config.json`).toString('utf-8')

        if( !teiSchema || !baseConfigJSON ) {
            log.info('Application data is missing or corrupted.')
            return
        }

        this.baseConfig = JSON.parse(baseConfigJSON)

        let { fairCopyManifest, fairCopyConfig, idMap, projectFilePath } = project

        if( !fairCopyManifest || !fairCopyConfig || !idMap ) {
            log.info('Project file is missing required entries.')
            return
        }

        // project store keeps a copy of the manifest data
        this.manifestData = fairCopyManifest

        const currentVersion = this.fairCopyApplication.config.version
        if( app.isPackaged && !compatibleProject(this.manifestData, currentVersion) ) {
            log.info('Project file is incompatible.')
            const incompatInfo = { projectFilePath, projectFileVersion: this.manifestData.generatedWith }
            this.fairCopyApplication.sendToMainWindow('projectIncompatible', incompatInfo)
            return
        }

        // migrate the manifestData to latest version 
        this.manifestData = migrateManifestData(this.manifestData)
        
        // if elements changed in config, migrate project config
        migrateConfig(this.manifestData.generatedWith,this.baseConfig,fairCopyConfig, fairCopyAppConfig)
        this.migratedConfig = fairCopyConfig

        // clean up the idMap if there are no resources
        idMap = this.cleanUpIDMap(idMap)

        // apply any migrations to ID Map data
        idMap = migrateIDMap(this.manifestData.generatedWith,idMap,this.manifestData.resources)

        // setup search index if local 
        if( !this.manifestData.remote ) {
            this.searchIndex = new SearchIndex( teiSchema, this, (status) => {
                this.fairCopyApplication.sendToMainWindow('searchSystemStatus', status )
            })    
        }

        const projectData = { projectFilePath, fairCopyManifest: this.manifestData, teiSchema, fairCopyConfig, baseConfig: this.baseConfig, idMap }
        this.onProjectOpened( projectData )
    }

    // clean up the idMap if there are no resources
    cleanUpIDMap(idMap) {
        const { resources } = this.manifestData
        if( Object.values(resources).length === 0 ) {
            return "{}"
        } else {
            return idMap
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

    importIIIFStart( importList ) {
        this.importRunning(true)
        const importData = { command: 'start', importList }
        this.fairCopyApplication.sendToMainWindow('importData', importData )  
        this.importContinue()
    }

    importContinue() {
        this.fairCopyApplication.sendToMainWindow('importData', { command: 'next' } )  
    }

    importError(errorMessage) {
        this.fairCopyApplication.sendToMainWindow('importData', { command: 'error', errorMessage } )  
    }

    importEnd() {
        this.importRunning(false)
        this.saveManifest()
        this.fairCopyApplication.fairCopySession.requestResourceView()
    }

    importRunning(running) {
        this.importInProgress = running
    }

    requestExport(resourceEntries,path) {
        const { resources: localEntries, remote, userID, serverURL, projectID } = this.manifestData
        const projectData = { localEntries, remote, userID, serverURL, projectID }
        for( const resourceEntry of resourceEntries ) {
            this.projectArchiveWorker.postMessage({ messageType: 'request-export', resourceEntry, projectData, path })
        }
    }

    requestPreviewView(previewData) {
        const { resources: localEntries, remote, userID, serverURL, projectID } = this.manifestData
        const projectData = { localEntries, remote, userID, serverURL, projectID }
        this.projectArchiveWorker.postMessage({ messageType: 'request-preview', previewData, projectData })
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
    
    requestEditionCrafterData( url ) {
        // TODO respond from the cache. 
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
    
    removeResources(resourceIDs,idMap) {
        for( const resourceID of resourceIDs ) {
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
    
            if( resourceEntry.local ) {
                delete this.manifestData.resources[resourceID] 
                if( resourceEntry.type !== 'teidoc' ) {
                    this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: resourceID })
                }
            } else {
                resourceEntry.deleted = true
                this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )
            }
    
            log.info(`Removed resource from project: ${resourceID}`)
        }
        if( idMap ) {
            this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })  
        }
        this.saveManifest()
    }

    recoverResources( resourceIDs, idMap ) {
        for( const resourceID of resourceIDs ) {
            const resourceEntry = this.manifestData.resources[resourceID] 

            if( resourceEntry ) {
                resourceEntry.deleted = false
                this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry  )
            }    
        }
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })  
        this.saveManifest()
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

    saveFairCopyConfig( fairCopyConfig, lastAction=null ) {
        this.migratedConfig = null
        if( lastAction ) {
            this.manifestData.configLastAction = lastAction
        }
        const configData = JSON.stringify(fairCopyConfig)
        if( configData && configData.length > 0 ) {
            this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: configSettingsEntryName, data: configData })
            this.saveManifest()    
        } else {
            log.error(`Cannot save empty FairCopy Config.`)
        }
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

    updateProjectInfo(projectInfo) {
        const { name, description, permissions } = projectInfo
        this.manifestData.projectName = name
        this.manifestData.description = description    
        this.manifestData.permissions = permissions
        this.saveManifest()
    }

    checkIn(userID, serverURL, projectID, committedResources, message) {
        this.projectArchiveWorker.postMessage({ messageType: 'check-in', userID, serverURL, projectID, committedResources, message })
    }

    checkOut(userID, serverURL, projectID, resourceEntries ) {
        this.projectArchiveWorker.postMessage({ messageType: 'check-out', userID, serverURL, projectID, resourceEntries })
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

    openResource(resourceID,xmlID) {
        const resourceEntry = this.manifestData.resources[resourceID]
        if( resourceEntry ) {
            this.projectArchiveWorker.postMessage({ messageType: 'read-resource', resourceID, xmlID })
        }
    }

    checkOutResults(resources,error) {        
        const checkOutStatus = []
        for( const resource of Object.values(resources) ) {
            const { state, resourceEntry, parentEntry, content } = resource
            if( state === 'success') {
                this.manifestData.resources[resourceEntry.id] = resourceEntry
                this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )   
                if( parentEntry ) this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', parentEntry )   
                this.fairCopyApplication.sendToAllWindows('resourceContentUpdated', { resourceID: resourceEntry.id, messageID: 'check-out-messsage', resourceContent: content })     
            } 
            checkOutStatus.push({ state, resourceEntry })
        }
        const idMap = this.fairCopyApplication.fairCopySession.idMapAuthority.checkOut(resources)
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })
        this.saveManifest()      

        this.fairCopyApplication.sendToMainWindow('checkOutResults', checkOutStatus, error ) 
        this.fairCopyApplication.fairCopySession.requestResourceView()
    }

    checkInResults(resourceStatus, error) {
        const { userID } = this.manifestData
        const resourceEntries = []
        for( const resourceID of Object.keys(resourceStatus) ) {
            const resourceEntry = this.manifestData.resources[resourceID]
            if( !error ) {
                // remove remote resources from project file and manifest, update all windows 
                this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: resourceID })   
                resourceEntry.local = false
                resourceEntry.lastAction = { action_type: 'check_in', user: { id: userID } }
                this.fairCopyApplication.sendToAllWindows('resourceEntryUpdated', resourceEntry )
                delete this.manifestData.resources[resourceID]     
            }
            resourceEntries.push(resourceEntry)
        }
        if( !error ) {
            const idMap = this.fairCopyApplication.fairCopySession.idMapAuthority.checkIn(resourceEntries)  
            this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })              
            this.saveManifest()
            this.fairCopyApplication.fairCopySession.requestResourceView()
        }
        this.fairCopyApplication.sendToMainWindow('checkInResults', {resourceEntries, resourceStatus, error} ) 
    }

    getLocalResources() {
        const resourceEntries = Object.values( this.manifestData.resources )

        const localResources = {}
        for( const resourceEntry of resourceEntries ) {
            if( resourceEntry.type !== 'image') {
                localResources[resourceEntry.id] = resourceEntry
            }
        }
        return localResources
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