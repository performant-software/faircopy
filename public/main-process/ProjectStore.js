const JSZip = require('jszip')
const fs = require('fs')
const os = require('os')
const debounce = require('debounce')
const format = require('xml-formatter')
const log = require('electron-log')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'
const idMapEntryName = 'id-map.json'
const zipWriteDelay = 200

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
        this.jobsInProgress = []

        // create a debounced function for writing the ZIP
        this.writeProjectArchive = debounce(() => {
            const jobNumber = Date.now()
            this.jobsInProgress.push(jobNumber)
            // write to a temp file first, to avoid corrupting the ZIP if we can't finish for some reason.
            const tempPath = `${this.tempDir}/${jobNumber}.zip`
            writeArchive( tempPath, this.projectArchive, () => { 
                fs.copyFileSync( tempPath, this.projectFilePath )
                fs.unlinkSync( tempPath )
                this.jobsInProgress.pop() 
            })
        },zipWriteDelay)
    }

    setupTempFolder() {
        const tempFolderBase = `${os.tmpdir()}/faircopy/`
        if( !fs.existsSync(tempFolderBase) ) fs.mkdirSync(tempFolderBase)
        this.tempDir = fs.mkdtempSync(tempFolderBase)
    }

    async openProject(projectFilePath) {
        const { baseDir } = this.fairCopyApplication
        
        const data = fs.readFileSync(projectFilePath)
        this.projectArchive = await JSZip.loadAsync(data)
        this.projectFilePath = projectFilePath

        if( !this.projectArchive ) {
            log.info('Attempted to open invalid project file.')
            return
        }
        const fairCopyManifest = await this.readUTF8File(manifestEntryName)
        const fairCopyConfig = await this.readUTF8File(configSettingsEntryName)
        const idMap = await this.readUTF8File(idMapEntryName)
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        const menuGroups = fs.readFileSync(`${baseDir}/config/menu-groups.json`).toString('utf-8')

        if( !teiSchema || !menuGroups ) {
            log.info('Application data is missing or corrupted.')
            return
        }

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

        // temp folder for streaming zip data
        this.setupTempFolder()

        const projectData = { projectFilePath, fairCopyManifest, teiSchema, fairCopyConfig, menuGroups, idMap }
        this.fairCopyApplication.sendToMainWindow('projectOpened', projectData )
    }

    async openImageView(imageView,imageViewInfo) {
        const { resourceID, xmlID } = imageViewInfo
        const { baseDir } = this.fairCopyApplication
        const idMap = await this.readUTF8File(idMapEntryName)
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')

        const resourceEntry = this.manifestData.resources[resourceID]
        if( resourceEntry ) {
            const resource = await this.readUTF8File(resourceID)
            const imageViewData = { resourceID, xmlID, resource, teiSchema, idMap }
            imageView.webContents.send('imageViewOpened', imageViewData )    
        }
    }

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

    saveResource(resourceID, resourceData) {
        const { resources } = this.manifestData
        const resourceEntry = resources[resourceID]
        if( resourceEntry ) {
            this.writeUTF8File(resourceID,resourceData)
            this.writeProjectArchive()
        }
    }

    addResource( resourceEntryJSON, resourceData ) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        this.manifestData.resources[resourceEntry.id] = resourceEntry
        this.projectArchive.file(resourceEntry.id, resourceData)
        this.saveManifest()
    }

    removeResource(resourceID) {
        delete this.manifestData.resources[resourceID] 
        this.projectArchive.remove(resourceID)
        this.saveManifest()
    }

    updateResource(resourceEntryJSON) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        this.manifestData.resources[resourceEntry.id] = resourceEntry
        this.saveManifest()
    }

    async exportResources(resourceIDs,path) {
        for( const resourceID of resourceIDs ) {
            const resourceEntry = this.manifestData.resources[resourceID]
            const resource = await this.readUTF8File(resourceID)
            const xml = format(resource, {
                indentation: '\t', 
                collapseContent: true, 
                lineSeparator: '\n'
            })
            const filePath = `${path}/${resourceEntry.localID}.xml`
            fs.writeFileSync(filePath,xml)
        }
        log.info(`Export resources to: ${path}`)
    }

    saveManifest() {
        this.writeUTF8File( manifestEntryName, JSON.stringify(this.manifestData))
        this.writeProjectArchive()
    }

    saveFairCopyConfig( fairCopyConfig ) {
        this.writeUTF8File( configSettingsEntryName, fairCopyConfig)
        this.writeProjectArchive()
    }

    saveIDMap( idMap ) {
        this.writeUTF8File( idMapEntryName, idMap)
        this.writeProjectArchive()
    }

    updateProjectInfo(projectInfoJSON) {
        const projectInfo = JSON.parse(projectInfoJSON)
        const { name, description } = projectInfo
        this.manifestData.projectName = name
        this.manifestData.description = description    
        this.saveManifest()
    }

    async openResource(resourceID) {
        const resourceEntry = this.manifestData.resources[resourceID]
        if( resourceEntry ) {
            const resource = await this.readUTF8File(resourceID)
            const resourceData = { resourceID, resource }
            this.fairCopyApplication.sendToMainWindow('resourceOpened', resourceData )
        }
    }

    writeUTF8File( targetFilePath, data ) {
        this.projectArchive.file(targetFilePath, data)
    }

    readUTF8File(targetFilePath) {
        return this.projectArchive
            .file(targetFilePath)
            .async("string")
    }
}

function writeArchive(zipPath, zipData, whenFinished=null) {
    zipData
        .generateNodeStream({
            type:'nodebuffer',
            compression: "DEFLATE",
            compressionOptions: {
                level: 1
            },
            streamFiles:true
        })
        .pipe(fs.createWriteStream(zipPath))
        .on('finish', () => {
            if( whenFinished ) {
                log.info(`${zipPath} written.`);
                whenFinished()
            }
        });
}

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