// const fairCopy = window.fairCopy

import TEIDocument from "./TEIDocument"

export default class IDMap {

    constructor( fairCopyProject ) {
        this.fairCopyProject = fairCopyProject
        this.idMap = {}
    }

    addResourcetoMap(resource) {
        const resourceEntry = this.fairCopyProject.resources[resource.id]
        const { localID } = resourceEntry
        
        let ids
        if( resource instanceof TEIDocument ) {
            ids = resource.getXMLIDs()
        } else {
            // TODO get ids for facs
            ids = {}
        }
        this.idMap[localID] = ids
    }

    getLocalURI( uri, parent ) {
        // TODO take uri and return a local URI 
    }

    set( uri, value ) {

    }

    get( uri ) {
        // retrieve the record for this URI
    }

    getRelativeURIList( parent ) {

    }

    save() {
        // TODO save ID map
        // fairCopy.services.ipcSend('requestSave', this.resourceID, fileContents)
        // this.changedSinceLastSave = false
    }
}
