const AdmZip = require('adm-zip');
const fs = require('fs')

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
    }

    openProject(targetFile) {
        const { baseDir } = this.fairCopyApplication
        this.projectArchive = new AdmZip(targetFile)
        const fairCopyManifest = this.openUTF8File('faircopy-manifest.json')
        const fairCopyConfig = this.openUTF8File('config-settings.json')
        const teiSchema = fs.readFileSync(`${baseDir}/config/tei-simple.json`).toString('utf-8')
        const menuGroups = fs.readFileSync(`${baseDir}/config/menu-groups.json`).toString('utf-8')
        const projectData = { fairCopyManifest, teiSchema, fairCopyConfig, menuGroups }
        
        // project store keeps a copy of the resource data
        const manifestData = JSON.parse(fairCopyManifest)
        this.resources = manifestData.resources

        this.fairCopyApplication.sendToMainWindow('fileOpened', projectData )
    }

    openResource = (resourceID) => {
        const resourceEntry = this.resources[resourceID]
        if( resourceEntry ) {
            const resource = this.openUTF8File(resourceEntry.filePath)
            const resourceData = { resourceID, resource }
            this.fairCopyApplication.sendToMainWindow('resourceOpened', resourceData )
        }
    }

    openUTF8File(targetFilePath) {
        const zipEntries = this.projectArchive.getEntries() 
        const targetEntry = zipEntries.find((entry) => entry.entryName === targetFilePath)
        return targetEntry ? targetEntry.getData().toString('utf8') : null
    }

}

exports.ProjectStore = ProjectStore