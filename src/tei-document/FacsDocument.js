import {teiToFacsimile, facsimileToTEI} from './convert-facs'

const fairCopy = window.fairCopy

export default class FacsDocument {

    constructor( resourceID, imageViewContext, resource=null ) {
        this.imageViewContext = imageViewContext
        this.facs = null

        if( resourceID ) {
            this.resourceID = resourceID
            if( !resource ) {
                this.name = 'test'
                this.requestResource( resourceID )    
            } else {
                this.load(resource)
            }
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
