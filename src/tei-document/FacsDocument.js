import { v4 as uuidv4 } from 'uuid'
import {teiToFacsimile, facsimileToTEI, generateOrdinalID} from './convert-facs'

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

    nextSurfaceID() {
        // TODO scan for highest number
        return generateOrdinalID('f', this.facs.surfaces.length )
    }

    addLocalImages( imagesData ) {
        for( const imageData of imagesData ) {
            const { width, height, mimeType, path } = imageData
            const resourceEntryID = uuidv4()

            // create a surface and add it to the document in the right location
            const surface = {
                id: this.nextSurfaceID(),
                type: 'local',
                localLabels: { none: [path] },
                resourceEntryID,
                width,
                height,
                mimeType
            }
            this.facs.surfaces.push(surface)

            // create a resource entry for this image
            const resourceEntry = {
                id: resourceEntryID,
                localID: `${this.resourceID}/${surface.id}`,
                name: path,
                mimeType,
                type: 'image'
            }

            // send the entry plus path to project store
            fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), path )
        }
    }

    deleteSurface(surfaceIndex) {
        const surface = this.facs.surfaces[surfaceIndex]
        if( surface.type === 'image' ) {
            const { resourceEntryID } = surface
            fairCopy.services.ipcSend('removeResource', resourceEntryID )
        }
        delete this.facs.surfaces[surfaceIndex]
        this.changedSinceLastSave = true
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
