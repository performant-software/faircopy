const AdmZip = require('adm-zip');

const { ConfigManager } = require('./ConfigManager')

class ProjectStore {

    constructor(fairCopyApplication) {
        this.fairCopyApplication = fairCopyApplication
    }

    openProject(targetFile) {
        this.projectArchive = new AdmZip(targetFile)
        this.loadManifest()
        this.configManager = new ConfigManager()
        this.fairCopyApplication.sendToMainWindow('fileOpened', targetFile )
    }

    loadManifest() {
        const json = this.openUTF8File('faircopy-manifest.json')
        const fairCopyManifest = JSON.parse(json)
        this.defaultResource = fairCopyManifest.defaultResource
        this.projectName = fairCopyManifest.projectName
        this.resources = fairCopyManifest.resources
    }

    openUTF8File(targetFilePath) {
        const zipEntries = this.projectArchive.getEntries() 
        const targetEntry = zipEntries.find((entry) => entry.entryName === targetFilePath)
        return targetEntry ? targetEntry.getData().toString('utf8') : null
    }

}

exports.ProjectStore = ProjectStore