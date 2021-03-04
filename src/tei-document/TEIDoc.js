import { v4 as uuidv4 } from 'uuid'

const fairCopy = window.fairCopy

export default class TEIDoc {

    constructor( resourceID, fairCopyProject ) {
        this.fairCopyProject = fairCopyProject
        this.changedSinceLastSave = false
        this.content = null
        this.resourceID = resourceID
        this.requestResource( resourceID )    
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    getName() {
        const resource = this.fairCopyProject.resources[this.resourceID]
        return resource.name
    }

    load( teiDocJSON ) {
        this.content = JSON.parse(teiDocJSON)   
        this.loading = false
    }

    save() {
        const fileContents = JSON.stringify(this.content)
        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSave', messageID, this.resourceID, fileContents)
        this.changedSinceLastSave = false

        // Update the ID Map 
        // const { idMap } = this.fairCopyProject
        // const localID = this.fairCopyProject.getLocalID(this.resourceID)
        // idMap.mapFacsIDs( localID, this.facs )
        // idMap.save()
    }
}
