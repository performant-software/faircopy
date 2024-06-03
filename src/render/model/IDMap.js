import { resourceIDToLocalIDs } from "./id-map"

const fairCopy = window.fairCopy

export default class IDMap {

    constructor(idMapData) {
        this.lastMessageID = null
        this.updateListeners = []
        this.loadIDMap(JSON.parse(idMapData))

        // Listen for updates
        fairCopy.services.ipcRegisterCallback('IDMapUpdated', (e, d) => {
            this.loadIDMap(d.idMapData)
        })
    }

    loadIDMap(idMapData) {
        this.idMap = idMapData
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
                    const { resourceType, resourceID, ids } = resourceMap
                    if( resourceType === 'teidoc' ) {
                        for( const childID of Object.keys(ids)) {
                            const child = ids[childID]
                            if( child.ids[xmlID] ) {
                                return { localID: childID, xmlID, resourceID: child.resourceID, ...ids[childID].ids[xmlID] }
                            }
                        }
                    } else {
                        return { localID, xmlID, resourceID, ...ids[xmlID] }
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
        const { resourceType, ids } = resourceMap
        let highestID = -1
        if( resourceType === 'teidoc' ) {
            for( const childResourceMap of Object.values(ids) ) {
                if( childResourceMap.resourceType === 'facs' ) {
                    const childLastID = getHighestFacsID(childResourceMap.ids)
                    highestID = childLastID > highestID ? childLastID : highestID    
                }
            }
        } else {
            highestID = getHighestFacsID(ids)
        }
        return highestID + 1
    }

    getRelativeURIList( localID, parentID ) {
        const uris = []

        const getURIs = (ids) => {
            for( const xmlID of Object.keys(ids)) {
                uris.push(`#${xmlID}`)
            }   
            return uris
        }

        const resourceMapID = parentID ? parentID : localID
        const resourceMap = this.idMap[resourceMapID]
        const { ids } = resourceMap

        if( parentID ) {
            for( const childID of Object.keys(ids) ) {
                getURIs(ids[childID].ids)
            }
        } else {
            getURIs(ids)           
        }

        return uris.sort()
    }

    getLocalIDs(resourceID) {
        return resourceIDToLocalIDs(resourceID,this.idMap)
    }

    getResourceMap(localID,parentID) {
        return parentID ? this.idMap[parentID].ids[localID] : this.idMap[localID]
    }

    hasID(xmlID,localID) {
        const resourceMap = this.idMap[localID]
        const { resourceType, ids } = resourceMap
        if( resourceType === 'teidoc' ) {
            for( const childResourceMap of Object.values(ids) ) {
                if( childResourceMap.ids[xmlID] ) return true
            }
            return false
        } else {
            return !!ids[xmlID]
        }
    }    
}

function getHighestFacsID( ids ) {
    let highestID = -1
    for( const entryID of Object.keys(ids) ) {
        const entry = ids[entryID]
        if( entry.type === 'facs' ) {
            const idNo = parseInt(entryID.slice(1))
            if( idNo > highestID ) highestID = idNo    
        }
    }
    return highestID
}