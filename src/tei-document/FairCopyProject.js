import TEIDocument from "./TEIDocument"
import TEISchema from "./TEISchema"
import FairCopyConfig from "./FairCopyConfig"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectPath) {
        this.projectPath = projectPath
        this.loadManifest()
        this.fairCopyConfig = new FairCopyConfig("config-settings.json")
        this.teiSchema = new TEISchema()
        this.teiDocument = this.loadResource( this.defaultResource )
        // TODO refactor
        this.fairCopyConfig.createFromDoc(this.teiDocument)
    }

    loadManifest() {
        const json = fairCopy.services.readFileSync(`${this.projectPath}/faircopy-manifest.json`)
        const fairCopyManifest = JSON.parse(json)
        this.defaultResource = fairCopyManifest.defaultResource
    }

    loadResource( resourceID ) {
        const filePath = `${this.projectPath}/${resourceID}.xml`
        const teiDocument = new TEIDocument(filePath, this.teiSchema, this.fairCopyConfig)
        return teiDocument
    }
}