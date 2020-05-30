const AdmZip = require('adm-zip');
const fs = require('fs')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
    }

    openProject(projectFilePath) {
        const { baseDir } = this.fairCopyApplication
        this.projectArchive = new AdmZip(projectFilePath)
        this.projectFilePath = projectFilePath
        if( !this.projectArchive ) {
            console.log('Attempted to open invalid project file.')
            return
        }
        const fairCopyManifest = this.readUTF8File(manifestEntryName)
        const fairCopyConfig = this.readUTF8File(configSettingsEntryName)
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
            this.projectArchive.writeZip(this.projectFilePath, (err) => {
                if(err) console.log(err)
            })
        }
    }

    addResource( resourceEntryJSON, resourceData ) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        this.manifestData.resources[resourceEntry.id] = resourceEntry
        this.projectArchive.addFile(resourceEntry.id, resourceData)
        this.saveManifest()
    }

    removeResource(resourceID) {
        delete this.manifestData.resources[resourceID] 
        this.projectArchive.deleteFile(resourceID)
        this.saveManifest()
    }

    saveManifest() {
        this.writeUTF8File( manifestEntryName, JSON.stringify(this.manifestData))
        this.projectArchive.writeZip(this.projectFilePath, (err) => {
            if(err) console.log(err)
        })
    }

    openResource(resourceID) {
        const resourceEntry = this.manifestData.resources[resourceID]
        if( resourceEntry ) {
            const resource = this.readUTF8File(resourceID)
            const resourceData = { resourceID, resource }
            this.fairCopyApplication.sendToMainWindow('resourceOpened', resourceData )
        }
    }

    writeUTF8File( targetFilePath, data ) {
        this.projectArchive.updateFile(targetFilePath, data)
    }

    readUTF8File(targetFilePath) {
        const zipEntries = this.projectArchive.getEntries() 
        const targetEntry = zipEntries.find((entry) => entry.entryName === targetFilePath)
        return targetEntry ? targetEntry.getData().toString('utf8') : null
    }

}

const createProjectArchive = function createProject(projectInfo) {
    const { name, description, filePath } = projectInfo
    const projectArchive = new AdmZip()      
   
    const fairCopyManifest = {
        projectName: name,
        description: description,
        appVersion: "0.5.3",
        resources: {}
    }

    // TODO how to do config?
    const fairCopyConfig = {

    }

    projectArchive.addFile(manifestEntryName, JSON.stringify(fairCopyManifest))
    projectArchive.addFile(configSettingsEntryName, JSON.stringify(fairCopyConfig))
    projectArchive.writeZip(filePath)
}

exports.ProjectStore = ProjectStore
exports.createProjectArchive = createProjectArchive