import TEIDocument from "./TEIDocument"
import TEISchema from "./TEISchema"
import FairCopyConfig from "./FairCopyConfig"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectPath) {
        this.projectPath = projectPath
        this.loadManifest()
        this.fairCopyConfig = new FairCopyConfig(`${this.projectPath}/config-settings.json`)
        this.teiSchema = new TEISchema()
    }

    loadManifest() {
        const json = fairCopy.services.readFileSync(`${this.projectPath}/faircopy-manifest.json`)
        const fairCopyManifest = JSON.parse(json)
        this.defaultResource = fairCopyManifest.defaultResource
        this.projectName = fairCopyManifest.projectName
        this.resources = fairCopyManifest.resources
    }

    openResource( resourceID ) {
        const resourceEntry = this.resources[resourceID]
        if( !resourceEntry ) return null

        if( resourceEntry.type === 'text') {
            const filePath = `${this.projectPath}/${resourceEntry.filePath}`
            const teiDocument = new TEIDocument( resourceID, filePath, this.teiSchema, this.fairCopyConfig)
            return teiDocument    
        } else {
            // TODO load facs
            return null
        }        
    }
}