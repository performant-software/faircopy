import { getThumbnailURL } from './iiif'

const fairCopy = window.fairCopy

export default class IDMap {

    constructor(idMapData) {
        this.lastMessageID = null
        this.updateListeners = []
        this.loadIDMap(idMapData)

        // Listen for updates
        fairCopy.services.ipcRegisterCallback('IDMapUpdated', (e, d) => {
            this.loadIDMap(d.idMapData)
        })
    }

    loadIDMap(idMapData) {
        this.idMap = JSON.parse(idMapData)
    }

    mapResource( resourceType, content ) {
        return (resourceType === 'facs') ? this.mapFacsIDs(content) : this.mapTextIDs(content)
    }

    getTextEntry() {
        return { type: 'text', useCount: 1 }
    }
    
    getBlankResourceMap(multipart) {
        return { __multiPart__: multipart }
    }

    mapTextIDs(doc) {        
        const xmlIDMap = {}
        
        // gather up all xml:ids and their nodes/marks
        doc.descendants((node) => {
            const id = node.attrs['xml:id']
            if( id ) {
                if( xmlIDMap[id] && xmlIDMap[id].useCount ) {
                    xmlIDMap[id].useCount++
                } else {
                    xmlIDMap[id] = this.getTextEntry()
                }    
            }
            return true
        })

        return xmlIDMap
    }

    mapFacsIDs(facs) {
        const { surfaces } = facs

        const facsIDMap = {}
        for( const surface of surfaces ) {
            const thumbnailURL = surface.type === 'iiif' ? getThumbnailURL(surface) : `local://${surface.resourceEntryID}`
            facsIDMap[surface.id] = { type: 'facs', thumbnailURL }

            for( const zone of surface.zones ) {
                facsIDMap[zone.id] = { type: 'zone' }
            }
        }

        return facsIDMap
    }

    getMapEntry( localID ) {
        return this.idMap[localID]
    }

    get( uri, parent ) {
        try {
            let rootPath = parent ? parent : ''
            const url = new URL(uri, `https://uri.faircopy.com/${rootPath}`)
            if( url.hostname === 'uri.faircopy.com') {
                const localID = url.pathname.slice(1) // slice off /
                if( localID.length === 0 ) return null // relative URL w/no parent
                const xmlID = url.hash ? url.hash.slice(1) : null // slice off #
                const resourceMap = this.idMap[localID]
                if( resourceMap ) {
                    if( resourceMap.__multiPart__ ) {
                        for( const childID of Object.keys(resourceMap)) {
                            if( resourceMap[childID][xmlID] ) {
                                return { localID: childID, xmlID, ...resourceMap[childID][xmlID] }
                            }
                        }
                    } else {
                        return { localID, xmlID, ...resourceMap[xmlID] }
                    }
                } 
            }   
            // local ID not found or external URL
            return null
        } catch(e) {
            // not a valid URI
            return null            
        }
    }
    
    setResourceMap( resourceMap, localID, parentID ) {
        fairCopy.services.ipcSend('setResourceMap', resourceMap, localID, parentID )
    }

    nextSurfaceID( localID ) {
        const resourceMap = this.idMap[localID]

        let highestID = -1
        if( resourceMap.__multiPart__ ) {
            for( const key of Object.keys(resourceMap) ) {
                if( key === '__multiPart__' ) continue
                const childLastID = this.getHighestFacsID(resourceMap[key])
                highestID = childLastID > highestID ? childLastID : highestID
            }
        } else {
            highestID = this.getHighestFacsID(resourceMap)
        }
        return highestID + 1
    }

    getHighestFacsID( resourceMap ) {
        let highestID = -1
        for( const entryID of Object.keys(resourceMap) ) {
            const entry = resourceMap[entryID]
            if( entry.type === 'facs' ) {
                const idNo = parseInt(entryID.slice(1))
                if( idNo > highestID ) highestID = idNo    
            }
        }
        return highestID
    }

    getRelativeURIList( localResourceID, parentID ) {
        const uris = []

        const getURIs = (resourceID, resourceMap, local) => {
            for( const xmlID of Object.keys(resourceMap)) {
                if( xmlID === '__multiPart__' ) continue
                if( local ) {
                    uris.push(`#${xmlID}`)
                } else {
                    uris.push(`${resourceID}#${xmlID}`)
                }
            }   
            return uris
        }

        for( const resourceID of Object.keys(this.idMap) ) {
            const resourceMap = this.idMap[resourceID]
            if( resourceMap.__multiPart__ ) {
                const local = ( resourceID === parentID )
                for( const childID of Object.keys(resourceMap) ) {
                    getURIs(resourceID, resourceMap[childID], local)
                }
            } else {
                const local = ( resourceID === localResourceID )
                getURIs(resourceID, resourceMap, local)           
            }
        }
        return uris.sort()
    }

    isUnique(testID,parentLocalID=null) {
        if( parentLocalID ) {
            return !this.siblingHasID(testID,null,parentLocalID)
        } else {
            return this.idMap[testID] === undefined
        }
    }

    siblingHasID(testID,localID,parentLocalID) {
        const parentIDMap = this.idMap[parentLocalID]
        for( const siblingID of Object.keys(parentIDMap)) {
            if( localID !== siblingID ) {
                if( parentIDMap[testID] || parentIDMap[siblingID][testID] ) return true
            }
        }
        return false
    }

    getUniqueID(baseID) {
        return `${baseID}-${Date.now()}`
    }
}
