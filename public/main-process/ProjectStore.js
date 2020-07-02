const JSZip = require('jszip');
const fs = require('fs')
const debounce = require('debounce')
const format = require('xml-formatter');

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'
const idMapEntryName = 'id-map.json'
const zipWriteDelay = 200

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication

        // create a debounced function for writing the ZIP
        this.writeProjectArchive = debounce(() => {
            writeArchive(this.projectFilePath, this.projectArchive)
        },zipWriteDelay)
    }

    async openProject(projectFilePath) {
        const { baseDir } = this.fairCopyApplication
        
        const data = fs.readFileSync(projectFilePath)
        this.projectArchive = await JSZip.loadAsync(data)
        this.projectFilePath = projectFilePath

        if( !this.projectArchive ) {
            console.log('Attempted to open invalid project file.')
            return
        }
        const fairCopyManifest = await this.readUTF8File(manifestEntryName)
        const fairCopyConfig = await this.readUTF8File(configSettingsEntryName)
        const idMap = await this.readUTF8File(idMapEntryName)
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        const menuGroups = fs.readFileSync(`${baseDir}/config/menu-groups.json`).toString('utf-8')

        if( !teiSchema || !menuGroups ) {
            console.log('Application data is missing or corrupted.')
            return
        }

        if( !fairCopyManifest || !fairCopyConfig || !idMap ) {
            console.log('Project file is missing required entries.')
            return
        }
        
        // project store keeps a copy of the manifest data
        this.manifestData = JSON.parse(fairCopyManifest)
        if( !this.manifestData ) {
            console.log('Error parsing project manifest.')
            return
        }

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
        console.log(`Export resources to: ${path}`)
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

function writeArchive(zipPath, zipData) {
    // TODO can we debounce this to prevent numerous calls?
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
            console.log(`${zipPath} written.`);
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