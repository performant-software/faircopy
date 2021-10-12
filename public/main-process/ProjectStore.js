const fs = require('fs')
const log = require('electron-log')
const { v4: uuidv4 } = require('uuid')
const { Worker } = require('worker_threads')
const { readFile, stat } = require('fs/promises')

const { IDMapAuthority } = require('./IDMapAuthority')
const { compatibleProject, migrateConfig } = require('./data-migration')
const { SearchIndex } = require('./SearchIndex')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'
const idMapEntryName = 'id-map.json'

const maxImportFileSize = 500000

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
        this.importInProgress = false
    }

    initProjectArchiveWorker( projectFilePath ) {
        const projectArchiveWorker = new Worker('./public/main-process/project-archive-worker.js', { workerData: { projectFilePath } })

        projectArchiveWorker.on('message', (msg) => {
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
                        this.fairCopyApplication.sendToMainWindow('resourceOpened', { resourceID, resource } )        
                        log.info(`opened resourceID: ${resourceID}`)    
                    }
                    break
                case 'index-data':
                    {
                        const { resourceID, index } = msg
                        this.searchIndex.loadIndex(resourceID,index)        
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
                        const imageView = this.fairCopyApplication.imageViews[resourceID]
                        imageView.webContents.send('imageViewOpened', imageViewData )    
                    }
                    break
                default:
                    throw new Error('Unrecognized message type received from project archive.')
            }
        })

        projectArchiveWorker.on('error', function(e) { 
            log.error(e)
            throw new Error(e)
        })

        return projectArchiveWorker
    }

    openProject(projectFilePath) {
        if( !this.projectArchiveWorker ) {
            this.projectArchiveWorker = this.initProjectArchiveWorker(projectFilePath)
        } else {
            throw new Error("A project archive has already been opened.")
        }
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

        // id map authority tracks ids across processes
        this.idMapAuthority = new IDMapAuthority(idMap, this.manifestData.resources)

        // setup search index
        this.searchIndex = new SearchIndex( teiSchema, this, (status) => {
            this.fairCopyApplication.sendToMainWindow('searchSystemStatus', JSON.stringify(status) )
        })
        this.searchIndex.initSearchIndex( this.manifestData )

        const projectData = { projectFilePath, fairCopyManifest, teiSchema, fairCopyConfig, baseConfig, idMap }
        this.fairCopyApplication.sendToMainWindow('projectOpened', projectData )
    }

    openImageView(imageViewInfo) {
        const { resourceID, xmlID, parentID } = imageViewInfo
        const { baseDir } = this.fairCopyApplication
        const { idMapNext } = this.idMapAuthority
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')

        const resourceEntry = this.manifestData.resources[resourceID]
        const parentEntry = this.manifestData.resources[parentID]
        if( resourceEntry ) {
            const imageViewData = { resourceEntry, parentEntry, xmlID, teiSchema, idMap: JSON.stringify(idMapNext) }
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
        this.sendIDMapUpdate()
        this.saveManifest()
    }

    importRunning(running) {
        this.importInProgress = running
        this.searchIndex.pauseIndexing(running)
    }

    close() {
        this.projectArchiveWorker.postMessage({ messageType: 'close' })
        this.searchIndex.close()
    }

    loadSearchIndex( resourceID ) {
        // look for a corresponding index
        log.info(`loading index from project archive: ${resourceID}`)
        this.projectArchiveWorker.postMessage({ messageType: 'read-index', resourceID })
    }

    onIDMapUpdated(msgID, idMapData) {
        this.idMapAuthority.update(idMapData)
        this.sendIDMapUpdate(msgID)
    }

    sendIDMapUpdate(msgID) {
        const messageID = msgID ? msgID : uuidv4()
        const idMapData = JSON.stringify( this.idMapAuthority.idMapNext )
        this.fairCopyApplication.sendToAllWindows('IDMapUpdated', { messageID, idMapData } )
    }

    abandonResourceMap(resourceID) {
        this.idMapAuthority.abandonResourceMap(resourceID)
        this.sendIDMapUpdate()
    }

    saveResource(resourceID, resourceData) {
        const { resources } = this.manifestData
        const resourceEntry = resources[resourceID]
        if( resourceEntry ) {
            const idMap = this.idMapAuthority.commitResource(resourceID)
            this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })
            this.projectArchiveWorker.postMessage({ messageType: 'write-resource', resourceID, data: resourceData })
            this.save()
            return true
        }
        return false
    }

    saveIndex( resourceID, indexData ) {
        log.info(`saving index to project archive: ${resourceID}`)
        this.projectArchiveWorker.postMessage({ messageType: 'write-index', resourceID, data: indexData })
    }

    addResource( resourceEntryJSON, resourceData, resourceMapJSON ) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        this.manifestData.resources[resourceEntry.id] = resourceEntry
        if( resourceEntry.type === 'image' )  {
            this.projectArchiveWorker.postMessage({ messageType: 'add-local-file', resourceID: resourceEntry.id, localFilePath: resourceData })
        } else {
            const resourceMap = JSON.parse(resourceMapJSON)
            const idMap = this.idMapAuthority.addResource(resourceEntry,resourceMap)
            this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })
            if(!this.importInProgress) this.sendIDMapUpdate()
            this.projectArchiveWorker.postMessage({ messageType: 'write-resource', resourceID: resourceEntry.id, data: resourceData })
        }

        if(this.importInProgress) {
            this.importContinue()
        } else {
            this.saveManifest()
        }
    }
    
    removeResource(resourceID) {
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
        } else if( resourceEntry.type === 'text' || resourceEntry.type === 'header' || resourceEntry.type === 'standOff' ) {
            // remove associated search index
            this.searchIndex.removeIndex(resourceID)
            const resourceIndexID = `${resourceID}.index`
            this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: resourceIndexID })    
        }

        const idMap = this.idMapAuthority.removeResource(resourceID)
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: idMapEntryName, data: idMap })  
        this.sendIDMapUpdate()

        delete this.manifestData.resources[resourceID] 
        this.projectArchiveWorker.postMessage({ messageType: 'remove-file', fileID: resourceID })    

        log.info(`Removed resource from project: ${resourceID}`)
        this.saveManifest()
    }

    updateResource(resourceEntryJSON) {
        const { resources } = this.manifestData
        const resourceEntry = JSON.parse(resourceEntryJSON)
        if( resources[resourceEntry.id] ) {
            const currentLocalID = resources[resourceEntry.id].localID
            this.manifestData.resources[resourceEntry.id] = resourceEntry
            if( resourceEntry.localID !== currentLocalID ) {
                this.idMapAuthority.changeID( resourceEntry.localID, resourceEntry.id ) 
                this.sendIDMapUpdate()
            }
            this.saveManifest()
            return true
        }
        log.info(`Error updating resource entry: ${resourceEntry.id}`)
        return false
    }

    saveManifest() {
        const currentVersion = this.fairCopyApplication.config.version
        this.manifestData.generatedWith = currentVersion
        this.projectArchiveWorker.postMessage({ messageType: 'write-file', fileID: manifestEntryName, data: JSON.stringify(this.manifestData) })
        this.save()
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