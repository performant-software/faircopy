const AdmZip = require('adm-zip');
const fs = require('fs')

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
        const fairCopyManifest = this.readUTF8File('faircopy-manifest.json')
        const fairCopyConfig = this.readUTF8File('config-settings.json')
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
        
        const manifestData = JSON.parse(fairCopyManifest)
        if( !manifestData ) {
            console.log('Error parsing project manifest.')
            return
        }
        // project store keeps a copy of the resource data
        this.resources = manifestData.resources

        const projectData = { projectFilePath, fairCopyManifest, teiSchema, fairCopyConfig, menuGroups }
        this.fairCopyApplication.sendToMainWindow('fileOpened', projectData )
    }

    saveResource(resourceID, resourceData) {
        const resourceEntry = this.resources[resourceID]
        if( resourceEntry ) {
            this.writeUTF8File(resourceID,resourceData)
            this.projectArchive.writeZip(this.projectFilePath, (err) => {
                if(err) console.log(err)
            })
        }
    }

    addResource( resourceEntryJSON, resourceData ) {
        const resourceEntry = JSON.parse(resourceEntryJSON)
        this.resources[resourceEntry.id] = resourceEntry
        this.projectArchive.addFile(resourceEntry.id, resourceData)
        this.saveManifest()
    }

    removeResource(resourceID) {
        this.resources[resourceID] = null
        this.projectArchive.deleteFile(resourceID)
        this.saveManifest()
    }

    saveManifest() {
        // TODO
    }

    openResource(resourceID) {
        const resourceEntry = this.resources[resourceID]
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

    projectArchive.addFile('faircopy-manifest.json', JSON.stringify(fairCopyManifest))
    projectArchive.addFile('config-settings.json', JSON.stringify(fairCopyConfig))
    projectArchive.writeZip(filePath)
}

exports.ProjectStore = ProjectStore
exports.createProjectArchive = createProjectArchive