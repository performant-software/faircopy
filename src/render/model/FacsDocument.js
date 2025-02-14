import { v4 as uuidv4 } from 'uuid'
import {teiToFacsimile, facsimileToTEI, generateOrdinalID, setSurfaceTitle} from './convert-facs'
import { mapResource } from './id-map'
import { cloudInitialConfig } from './FairCopyProject'

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

    onResourceUpdated = ( eventType, resource ) => {
        let changed = false
        if( eventType === 'resourceEntryUpdated' ) {
            const { id: targetResourceID } = resource
            if( this.resourceID === targetResourceID ) {
                this.resourceEntry = resource
                this.resourceID = this.resourceEntry.id  
                this.resourceType = this.resourceEntry.type
                changed = true
            }
            if( this.parentEntry && this.parentEntry.id === targetResourceID ) {
                this.parentEntry = resource
                changed = true
            }
        } else if( eventType === 'resourceContentUpdated' ) {
            const { resourceID: targetResourceID, resourceContent, messageID } = resource
            // ignore content messages from yourself
            if( targetResourceID === this.resourceID && messageID !== this.lastMessageID ) {
                this.load(resourceContent)
                changed = true
            }
        }

        // communicate to the views that something has changed
        if( changed ) {
            for( const listener of this.updateListeners ) {
                listener()
            }
        }
    }

    isEditable() {
        return this.imageViewContext.isEditable( this.resourceEntry )
    }

    isRemote() {
        return this.imageViewContext.remote
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
        const localID = this.parentEntry ? this.parentEntry.localID : this.resourceEntry.localID
        return this.imageViewContext.hasID(targetID, localID) 
    }

    addLocalImages( imagesData ) {
        const { idMap } = this.imageViewContext
        const isWin32 = fairCopy.getPlatform() === 'win32'
        const seperatorChar = isWin32 ? "\\" : "/"
        let nextSurfaceID = this.parentEntry ? idMap.nextSurfaceID(this.parentEntry.localID) : idMap.nextSurfaceID(this.resourceEntry.localID)

        for( const imageData of imagesData ) {
            const { width, height, mimeType, path } = imageData
            const resourceEntryID = uuidv4()
            
            // get the label from the file path
            const segments = path.split(seperatorChar)
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
                type: 'image',
                ...cloudInitialConfig
            }

            // send the entry plus path to project store
            fairCopy.ipcSend('addResource', resourceEntry, path )
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
                fairCopy.ipcSend('removeResource', resourceEntryID )
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

    duplicateSurface( surfaceIndex ) {
        const surface = this.getSurface(surfaceIndex)
        const { id, type, canvasURI, resourceEntryID, localLabels, width, height, mimeType, imageAPIURL, zones } = surface

        const nextLocalLabels = {}
        for( const localLabelKey of Object.keys(localLabels) ) {
            nextLocalLabels[localLabelKey] = [ ...localLabels[localLabelKey] ]
        }

        const nextZones = []
        for( const zone of zones ) {
            const { id, ulx, uly, lrx, lry, note } = zone
            nextZones.push({ id, ulx, uly, lrx, lry, note })
        }

        const dupeSurface = {
            id,
            type,
            canvasURI,
            resourceEntryID,
            localLabels: nextLocalLabels,
            width,
            height,
            mimeType,
            imageAPIURL,
            zones: nextZones
        }
        return dupeSurface
    }

    moveSurfaces( movingSurfaces, targetFacs, onMoved ) {
        const resourceOpened = (e, resourceData) => {
            const { resourceEntry, parentEntry, resource } = resourceData

            // make sure this is the document we are waiting for
            if( resourceEntry.id === targetFacs.id ) {
                const targetFacsDoc = new FacsDocument( resourceEntry, parentEntry, this.imageViewContext, resource )
                const targetSurfaceList = targetFacsDoc.facs.surfaces
                const { idMap } = this.imageViewContext

                // add the surfaces to the target facs
                for( const movingSurfaceIndex of movingSurfaces ) {
                    const dupeSurface = this.duplicateSurface(movingSurfaceIndex)
                    if( targetSurfaceList.find( s => s.id === dupeSurface.id )) {
                        let nextSurfaceID = parentEntry ? idMap.nextSurfaceID(parentEntry.localID) : idMap.nextSurfaceID(resourceEntry.localID)
                        dupeSurface.id = generateOrdinalID('f',nextSurfaceID++)
                        // update the surface ID in the zones
                        for( const zone of dupeSurface.zones ) {
                            zone.id = `${dupeSurface.id}_z${zone.id.split('_z')[1]}`
                        }
                    }
                    targetSurfaceList.push(dupeSurface)
                }
                
                targetFacsDoc.save()        
                onMoved(true)
            }
        }

        // before we move things, we need to load the targetFacs
        fairCopy.ipcRegisterCallbackOnce('resourceOpened', resourceOpened )
        fairCopy.ipcSend('openResource', targetFacs.id )        
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
        fairCopy.ipcSend('abandonResourceMap', this.resourceID)
    }

    save() {
        // Update the ID Map 
        const { idMap } = this.imageViewContext
        const resourceMap = mapResource( this.resourceEntry, this.facs )
        idMap.setResourceMap(resourceMap,this.resourceEntry.localID, this.parentEntry?.localID)

        // save the facs
        const fileContents = facsimileToTEI(this.facs)
        const messageID = uuidv4()
        fairCopy.ipcSend('requestSave', messageID, this.resourceID, fileContents)
        this.changedSinceLastSave = false
        this.lastMessageID = messageID
    }
}
