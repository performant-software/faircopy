const JSZip = require('jszip');
const fs = require('fs')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
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
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        const menuGroups = fs.readFileSync(`${baseDir}/config/menu-groups.json`).toString('utf-8')

        if( !teiSchema || !menuGroups ) {
            console.log('Application data is missing or corrupted.')
            return
        }

        if( !fairCopyManifest || !fairCopyConfig ) {
            console.log('Project file is missing required files.')
            return
        }
        
        // project store keeps a copy of the manifest data
        this.manifestData = JSON.parse(fairCopyManifest)
        if( !this.manifestData ) {
            console.log('Error parsing project manifest.')
            return
        }

        const projectData = { projectFilePath, fairCopyManifest, teiSchema, fairCopyConfig, menuGroups }
        this.fairCopyApplication.sendToMainWindow('fileOpened', projectData )
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
        this.projectArchive.file(resourceEntry.id, Buffer.alloc(resourceData.length, resourceData))
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

    saveManifest() {
        this.writeUTF8File( manifestEntryName, JSON.stringify(this.manifestData))
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
        this.projectArchive.file(targetFilePath, Buffer.alloc(data.length, data))
    }

    readUTF8File(targetFilePath) {
        return this.projectArchive
            .file(targetFilePath)
            .async("string")
    }

    writeProjectArchive() {
        writeArchive(this.projectFilePath, this.projectArchive)
    }
}

function writeArchive(zipPath, zipData) {
    zipData
        .generateNodeStream({type:'nodebuffer',streamFiles:true})
        .pipe(fs.createWriteStream(zipPath))
        .on('finish', function () {
            console.log(`${zipPath} written.`);
        });
}

const createProjectArchive = function createProject(projectInfo) {
    const { name, description, filePath } = projectInfo
    const projectArchive = new JSZip()      
   
    const fairCopyManifest = {
        projectName: name,
        description: description,
        appVersion: "0.5.3",
        resources: {}
    }

    // TODO how to do config?
    const fairCopyConfig = {

    }

    projectArchive.file(manifestEntryName, JSON.stringify(fairCopyManifest))
    projectArchive.file(configSettingsEntryName, JSON.stringify(fairCopyConfig))
    writeArchive(filePath,projectArchive)
}

exports.ProjectStore = ProjectStore
exports.createProjectArchive = createProjectArchive