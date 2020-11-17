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

    getSurface(index) {
        return this.facs.surfaces[index]
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    addLocalImages( imagePaths ) {
        // for( const imagePath of imagePaths ) {
        //     // create a surface and add it to the document in the right location
        //     const surface = {
        //         id,
        //         type: 'local',
        //         localLabels,
        //         width,
        //         height,
        //     }
        //     this.facs.push(surface)

        //     // create a resource entry for this image
        //     const resourceEntry = {
        //         id: uuidv4(),
        //         localID,
        //         name, 
        //         type: 'image'
        //     }

        //     // send the entry plus path to project store
        //     fairCopy.services.ipcSend('addResource', resourceEntry, imagePath )
        // }
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
