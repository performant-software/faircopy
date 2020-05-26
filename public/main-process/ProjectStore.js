const AdmZip = require('adm-zip');
const fs = require('fs')

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
    }

    openProject(targetFile) {
        const { baseDir } = this.fairCopyApplication
        this.projectArchive = new AdmZip(targetFile)
        if( !this.projectArchive ) {
            console.log('Attempted to open invalid project file.')
            return;
        }
        const fairCopyManifest = this.openUTF8File('faircopy-manifest.json')
        const fairCopyConfig = this.openUTF8File('config-settings.json')
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

        const projectData = { fairCopyManifest, teiSchema, fairCopyConfig, menuGroups }
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