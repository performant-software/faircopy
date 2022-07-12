import { v4 as uuidv4 } from 'uuid'
import {teiToFacsimile, facsimileToTEI, generateOrdinalID, setSurfaceTitle} from './convert-facs'
import { mapResource } from './id-map'

const fairCopy = window.fairCopy

export default class FacsDocument {

    constructor( resourceEntry, parentEntry, imageViewContext, resourceData ) {
        this.imageViewContext = imageViewContext
        this.changedSinceLastSave = false
        this.facs = null
        this.resourceID = resourceEntry.id
        this.resourceEntry = resourceEntry
        this.parentEntry = parentEntry
        this.updateListeners = []
        this.lastMessageID = null

        this.load(resourceData)
    }

    onResourceUpdated = ( resource ) => {
        if( resource.resourceEntry ) {
            const { resourceEntry } = resource
            if( resourceEntry.id === this.resourceEntry.id ) {
                this.resourceEntry = resourceEntry
                this.resourceID = resourceEntry.id
                this.resourceType = resourceEntry.type    
            }
            if( this.parentEntry && resourceEntry.id === this.parentEntry.id ) {
                this.parentEntry = resourceEntry
            }    
        }
        // load updated content if it is from a different source
        if( resource.resourceContent && resource.resourceID === this.resourceEntry.id && resource.messageID !== this.lastMessageID ) {
            const { resourceContent } = resource
            this.load(resourceContent)
        }
    }

    isEditable() {
        return this.imageViewContext.isEditable( this.resourceEntry )
    }

    isRemote() {
        return this.imageViewContext.remote
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

    getActiveView() {
        return null
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('openResource', resourceID )
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
        let nextSurfaceID = this.parentEntry ? idMap.nextSurfaceID(this.parentEntry.localID) : idMap.nextSurfaceID(this.resourceEntry.localID)

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
        const resourceMap = mapResource( this.resourceEntry, this.facs )
        idMap.setResourceMap(resourceMap,this.resourceEntry.localID, this.parentEntry?.localID)

        // save the facs
        const fileContents = facsimileToTEI(this.facs)
        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSave', messageID, this.resourceID, fileContents)
        this.changedSinceLastSave = false
        this.lastMessageID = messageID
    }
}
