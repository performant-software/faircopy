import { v4 as uuidv4 } from 'uuid'
import {teiToFacsimile, facsimileToTEI, generateOrdinalID, setSurfaceTitle} from './convert-facs'

const fairCopy = window.fairCopy

export default class FacsDocument {

    constructor( resourceID, imageViewContext, resource=null ) {
        this.imageViewContext = imageViewContext
        this.changedSinceLastSave = false
        this.facs = null
        this.resourceID = resourceID
        this.updateListeners = []
        this.lastMessageID = null

        if( !resource ) {
            this.requestResource( resourceID )    
        } else {
            this.load(resource)
        }

        // Listen for updates to this resource.
        fairCopy.services.ipcRegisterCallback('resourceUpdated', (e, d) => {
            if( d.resourceID === resourceID && d.messageID !== this.lastMessageID ) 
                this.onResourceUpdated(d.resourceData)
        })
    }

    // Called when document is updated by a different window process
    onResourceUpdated(resourceData) {
        this.load(resourceData)
        for( const listener of this.updateListeners ) {
            listener()
        }
    }

    addUpdateListener(listener) {
        this.updateListeners.push(listener)
    }

    removeUpdateListener(listener) {
        this.updateListeners = this.updateListeners.filter( l => l !== listener )
    }

    getSurface(index) {
        return this.facs.surfaces[index]
    }

    getIndex(xmlID) {
        const { surfaces } = this.facs
        const startIndex = surfaces.findIndex( s => s.id === xmlID )
        return startIndex === -1 ? 0 : startIndex
    }

    getParent() {
        const resourceEntry = this.imageViewContext.getResourceEntry(this.resourceID)
        return this.imageViewContext.getParent(resourceEntry)
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    // Next zone ID in format: <surfaceID>_z<next zone number>
    nextZoneID(surfaceID) {
        const surface = this.getSurface( this.getIndex(surfaceID) )

        // scan for highest number
        let highestID = -1
        for( const zone of surface.zones ) {
            // Zone IDs are either user entered or automatically generated here.
            // If this zone ID fits the format, use it to count up to 
            // the highest zone number thus issued.
            const regX = new RegExp(`${surfaceID}_z(\\d+)`)
            const matchData = zone.id.match(regX)
            if( matchData ) {
                const idNo = matchData[1] ? parseInt(matchData[1]) : -1
                if( idNo > highestID ) highestID = idNo
            }
        }
        const nextID = highestID + 1
        return generateOrdinalID(`${surfaceID}_z`, nextID )
    }

    hasID = (targetID) => {       
        const { surfaces } = this.facs

        // check to see if this ID exists in the parent resource
        if( this.imageViewContext.siblingHasID(targetID, this.resourceID) ) return true 

        for( const surface of surfaces ) {
            if(surface.id === targetID ) return true
            for( const zone of surface.zones ) {
                if(zone.id === targetID ) return true
            }
        }

        return false
    }

    addLocalImages( imagesData ) {
        const { idMap } = this.imageViewContext
        const resourceEntry = this.imageViewContext.getResourceEntry(this.resourceID)
        const parentEntry = this.imageViewContext.getParent(resourceEntry)
        let nextSurfaceID = parentEntry ? idMap.nextSurfaceID(parentEntry.localID) : idMap.nextSurfaceID(resourceEntry.localID)

        for( const imageData of imagesData ) {
            const { width, height, mimeType, path } = imageData
            const resourceEntryID = uuidv4()
            
            // get the label from the file path
            const segments = path.split('/')
            const label = segments[segments.length-1]

            // create a surface and add it to the document in the right location
            const surface = {
                id: generateOrdinalID('f', nextSurfaceID++ ),
                type: 'local',
                localLabels: { none: [label] },
                resourceEntryID,
                width,
                height,
                zones: [],
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
    }

    updateSurfaceInfo(surfaceInfo) {
        const { surfaceID, name } = surfaceInfo
        const surface = this.facs.surfaces[ this.getIndex(surfaceID) ]
        if( surface ) {
            setSurfaceTitle( surface, name )
            this.save()    
        }
    }

    load( facsXML ) {
        this.facs = teiToFacsimile(facsXML)        
        this.loading = false
    }

    abandonChanges() {
        this.changedSinceLastSave = false
        fairCopy.services.ipcSend('abandonResourceMap', this.resourceID)
    }

    save() {
        // Update the ID Map 
        const { idMap } = this.imageViewContext
        const resourceEntry = this.imageViewContext.getResourceEntry(this.resourceID)
        const parentEntry = this.imageViewContext.getParent(resourceEntry)
        const resourceMap = idMap.mapResource( 'facs', this.facs )
        idMap.setMap(resourceMap,resourceEntry.localID, parentEntry?.localID)
        idMap.update()

        // save the facs
        const fileContents = facsimileToTEI(this.facs)
        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSave', messageID, this.resourceID, fileContents)
        this.changedSinceLastSave = false
        this.lastMessageID = messageID
    }
}
