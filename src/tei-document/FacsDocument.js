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
        // scan for highest number
        let highestID = -1
        for( const surface of this.facs.surfaces ) {
            const idNo = parseInt(surface.id.slice(1))
            if( idNo > highestID ) highestID = idNo
        }
        const nextID = highestID + 1
        return generateOrdinalID('f', nextID )
    }

    addLocalImages( imagesData ) {
        for( const imageData of imagesData ) {
            const { width, height, mimeType, path } = imageData
            const resourceEntryID = uuidv4()
            
            // get the label from the file path
            const segments = path.split('/')
            const label = segments[segments.length-1]

            // create a surface and add it to the document in the right location
            const surface = {
                id: this.nextSurfaceID(),
                type: 'local',
                localLabels: { none: [label] },
                resourceEntryID,
                width,
                height,
                mimeType
            }
            this.facs.surfaces.push(surface)

            // create a resource entry for this image
            const resourceEntry = {
                id: resourceEntryID,
                localID: `${this.resourceID}`,
                name: label,
                mimeType,
                type: 'image'
            }

            // send the entry plus path to project store
            fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), path )
        }

        // save changes to this document
        this.save()
        this.updateIDMap()
    }

    deleteSurfaces(doomedSurfaces) {
        const {surfaces} = this.facs 

        // request delete for local images
        for( const surfaceIndex of doomedSurfaces ) {
            const surface = surfaces[surfaceIndex]
            if( surface.type === 'local' ) {
                const { resourceEntryID } = surface
                fairCopy.services.ipcSend('removeResource', resourceEntryID )
            }    
        }

        // create new surface list, without the deleted surfaces
        const nextSurfaces = []
        for( let i=0; i < surfaces.length; i++ ) {
            if( !doomedSurfaces.includes(i) ) nextSurfaces.push(surfaces[i])
        }
        this.facs.surfaces = nextSurfaces
        this.save()
        this.updateIDMap()
    }

    updateIDMap() {
        const { idMap } = this.imageViewContext
        const localID = this.imageViewContext.getLocalID(this.resourceID)
        idMap.mapFacsIDs( localID, this.facs )
        idMap.save()
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
