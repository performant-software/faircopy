import {teiToFacsimile, facsimileToTEI} from './convert-facs'

const fairCopy = window.fairCopy

export default class FacsDocument {

    constructor( resourceID, fairCopyProject ) {
        this.fairCopyProject = fairCopyProject
        this.facs = null

        if( resourceID ) {
            this.resourceID = resourceID
            this.name = 'test'
            this.requestResource( resourceID )
        }
        this.changedSinceLastSave = false
    }

    getSurfaces() {
        return this.facs.surfaces
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    load( facsXML ) {
        this.facs = teiToFacsimile(facsXML)        
        this.loading = false
    }

    save() {
        const fileContents = facsimileToTEI(this.facs)
        fairCopy.services.ipcSend('requestSave', this.resourceID, fileContents)
        this.changedSinceLastSave = false
    }
}
