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
        this.teiDocument = this.loadResource( this.defaultResource )
    }

    loadManifest() {
        const json = fairCopy.services.readFileSync(`${this.projectPath}/faircopy-manifest.json`)
        const fairCopyManifest = JSON.parse(json)
        this.defaultResource = fairCopyManifest.defaultResource
        this.projectName = fairCopyManifest.projectName
        this.resources = fairCopyManifest.resources
    }

    loadResource( resourceID ) {
        const filePath = `${this.projectPath}/${resourceID}.xml`
        const teiDocument = new TEIDocument(filePath, this.teiSchema, this.fairCopyConfig)
        return teiDocument
    }
}