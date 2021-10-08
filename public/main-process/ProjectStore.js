const JSZip = require('jszip')
const fs = require('fs')
const log = require('electron-log')
const { v4: uuidv4 } = require('uuid')

const { IDMapAuthority } = require('./IDMapAuthority')
const { compatibleProject, migrateConfig } = require('./data-migration')
const { SearchIndex } = require('./SearchIndex')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'
const idMapEntryName = 'id-map.json'

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
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
                case 'cache-file-data':
                    // TODO
                    break
                default:
                    // TODO
            }
        })

        projectArchiveWorker.on('error', function(e) { 
            log.error(e)
            throw new Error(e)
        })

        projectArchiveWorker.on('exit', function(e) { 
            // TODO
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

        // temp folder for streaming zip data
        this.setupTempFolder()

        // setup search index
        this.searchIndex = new SearchIndex( teiSchema, this, (status) => {
            this.fairCopyApplication.sendToMainWindow('searchReady', JSON.stringify(status) )
        })
        this.searchIndex.initSearchIndex( this.manifestData )

        const projectData = { projectFilePath, fairCopyManifest, teiSchema, fairCopyConfig, baseConfig, idMap }
        this.fairCopyApplication.sendToMainWindow('projectOpened', projectData )
    }

    // TODO REFACTOR
    async openImageView(imageView,imageViewInfo) {
        const { resourceID, xmlID, parentID } = imageViewInfo
        const { baseDir } = this.fairCopyApplication
        const { idMapNext } = this.idMapAuthority
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')

        const resourceEntry = this.manifestData.resources[resourceID]
        const parentEntry = this.manifestData.resources[parentID]
        if( resourceEntry ) {
            const resource = await this.readUTF8File(resourceID)
            const imageViewData = { resourceEntry, parentEntry, xmlID, resource, teiSchema, idMap: JSON.stringify(idMapNext) }
            imageView.webContents.send('imageViewOpened', imageViewData )    
        }
    }

    // TODO REFACTOR
    quitSafely = (quitCallback) => {
        // execute any pending write jobs
        this.writeProjectArchive.flush()

        if( this.jobsInProgress.length > 0 ) {
            // write jobs still active, wait a moment and then try again 
            setTimeout( () => { this.quitSafely(quitCallback) }, zipWriteDelay*2 )
        } else {
            // when we are done with jobs, quit 
            quitCallback()
        }
    }

    loadSearchIndex( resourceID ) {
        // look for a corresponding index
        log.info(`loading index from project archive: ${resourceID}`)
        this.projectArchiveWorker.postMessage({ messageType: 'read-index', resourceID })
    }

    // TODO REFACTOR
    onIDMapUpdated(msgID, idMapData) {
        this.idMapAuthority.update(idMapData)
        this.sendIDMapUpdate(msgID)
    }

    sendIDMapUpdate(msgID) {
        const messageID = msgID ? msgID : uuidv4()
        const idMapData = JSON.stringify( this.idMapAuthority.idMapNext )
        this.fairCopyApplication.sendToAllWindows('IDMapUpdated', { messageID, idMapData } )
    }

    // TODO REFACTOR
    abandonResourceMap(resourceID) {
        this.idMapAuthority.abandonResourceMap(resourceID)
        this.sendIDMapUpdate()
    }

    saveResource(resourceID, resourceData) {
        const { resources } = this.manifestData
        const resourceEntry = resources[resourceID]
        if( resourceEntry ) {
            const idMap = this.idMapAuthority.commitResource(resourceID)
            this.projectArchiveWorker.postMessage({ messageType: 'write-resource', resourceID: idMapEntryName, data: idMap })
            this.projectArchiveWorker.postMessage({ messageType: 'write-resource', resourceID, data: resourceData })
            this.projectArchiveWorker.postMessage({ messageType: 'save' })
            return true
        }
        return false
    }

    saveIndex( resourceID, indexData ) {
        log.info(`saving index to project archive: ${resourceID}`)
        this.projectArchiveWorker.postMessage({ messageType: 'write-index', resourceID, data: indexData })
        this.projectArchiveWorker.postMessage({ messageType: 'save' })
    }

    // TODO REFACTOR
    addResource( resourceEntryJSON, resourceData, resourceMapJSON ) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        this.manifestData.resources[resourceEntry.id] = resourceEntry
        if( resourceEntry.type === 'image' )  {
            const imageBuffer = fs.readFileSync(resourceData)
            this.projectArchive.file(resourceEntry.id, imageBuffer)
        } else {
            const resourceMap = JSON.parse(resourceMapJSON)
            const idMap = this.idMapAuthority.addResource(resourceEntry,resourceMap)
            this.writeUTF8File(idMapEntryName, idMap)
            this.sendIDMapUpdate()
            this.projectArchive.file(resourceEntry.id, resourceData)
        }

        this.saveManifest()
    }
    
    // TODO REFACTOR
    removeResource(resourceID) {
        const resourceEntry = this.manifestData.resources[resourceID] 

        // go through the manifest entries, if there are local images associated with this facs, delete them too
        if( resourceEntry.type === 'facs' ) {
            for( const entry of Object.values(this.manifestData.resources) ) {
                const {id, type, localID} = entry
                if( type === 'image' && localID.startsWith(resourceID) ) {
                    delete this.manifestData.resources[id] 
                    this.projectArchive.remove(id)            
                    log.info(`Removed image resource from project: ${id}`)
                }
            }
        } else if( resourceEntry.type === 'text' || resourceEntry.type === 'header' || resourceEntry.type === 'standOff' ) {
            // remove associated search index
            const resourceIndexID = `${resourceID}.index`
            this.projectArchive.remove(resourceIndexID)
            this.searchIndex.removeIndex(resourceID)
        }

        const idMap = this.idMapAuthority.removeResource(resourceID)
        this.writeUTF8File(idMapEntryName, idMap)
        this.sendIDMapUpdate()

        delete this.manifestData.resources[resourceID] 
        this.projectArchive.remove(resourceID)

        log.info(`Removed resource from project: ${resourceID}`)
        this.saveManifest()
    }

    // TODO REFACTOR
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

    // TODO REFACTOR
    saveManifest() {
        const currentVersion = this.fairCopyApplication.config.version
        this.manifestData.generatedWith = currentVersion
        this.writeUTF8File( manifestEntryName, JSON.stringify(this.manifestData))
        this.writeProjectArchive()
    }

    // TODO REFACTOR
    saveFairCopyConfig( fairCopyConfig ) {
        this.migratedConfig = null
        this.writeUTF8File( configSettingsEntryName, fairCopyConfig)
        this.saveManifest()
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

    // TODO REFACTOR
    async openImageResource(requestURL) {
        const resourceID = requestURL.replace(`local://`, '').replace('..','')
        const resourceEntry = this.manifestData.resources[resourceID]

        if( resourceEntry ) {
            // create a file path to the temp dir
            const ext = getExtensionForMIMEType(resourceEntry.mimeType)
            const fileName = `${resourceID}.${ext}`
            const cacheFile = `${this.tempDir}/${fileName}`

            if( !fs.existsSync(cacheFile) ) {
                // write the image to the temp dir
                const imageBuffer = await this.projectArchive.file(resourceID).async('nodebuffer')
                fs.writeFileSync(cacheFile,imageBuffer)
            }

            return cacheFile
        }    
        return null
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

// TODO REFACTOR
const createProjectArchive = function createProjectArchive(projectInfo,baseDir) {
    const { name, description, filePath, appVersion } = projectInfo
    const projectArchive = new JSZip()      
   
    const fairCopyManifest = {
        projectName: name,
        description: description,
        appVersion,
        resources: {}
    }

    // Load the initial config for the project
    const fairCopyConfig = fs.readFileSync(`${baseDir}/config/faircopy-config.json`).toString('utf-8')

    projectArchive.file(manifestEntryName, JSON.stringify(fairCopyManifest))
    projectArchive.file(configSettingsEntryName, fairCopyConfig)
    projectArchive.file(idMapEntryName, "{}")
    writeArchive(filePath,projectArchive)
}

exports.ProjectStore = ProjectStore
exports.createProjectArchive = createProjectArchive