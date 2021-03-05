import { v4 as uuidv4 } from 'uuid'

const fairCopy = window.fairCopy

export default class TEIDoc {

    constructor( resourceID, fairCopyProject ) {
        this.fairCopyProject = fairCopyProject
        this.resources = null
        this.resourceID = resourceID
        this.requestResource( resourceID )    
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    getResources() {
        if( this.loading ) return {}

        const resources = {}
        for( const resourceID of this.resources ) {
            const resource = this.fairCopyProject.resources[resourceID]
            resources[resourceID] = resource
        }
        return resources
    }

    addResource( resourceID ) {
        this.resources.push(resourceID)
        this.save()
    }

    removeResource( resourceID ) {
        this.resources = this.resources.map( r => r !== resourceID )
        this.save()
    }

    load( teiDocJSON ) {
        const teiDoc = JSON.parse(teiDocJSON)   
        this.resources = teiDoc.resources
        this.loading = false
    }

    save() {
        const fileContents = JSON.stringify({
            resources: this.resources
        })
        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSave', messageID, this.resourceID, fileContents)

        // Update the ID Map 
        // const { idMap } = this.fairCopyProject
        // const localID = this.fairCopyProject.getLocalID(this.resourceID)
        // idMap.mapFacsIDs( localID, this.facs )
        // idMap.save()
    }
}
