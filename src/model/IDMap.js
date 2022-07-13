import { resourceIDToLocalIDs } from "./id-map"

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
                    const { resourceType, ids } = resourceMap
                    if( resourceType === 'teidoc' ) {
                        for( const childID of Object.keys(ids)) {
                            if( ids[childID][xmlID] ) {
                                return { localID: childID, xmlID, ...ids[childID][xmlID] }
                            }
                        }
                    } else {
                        return { localID, xmlID, ...ids[xmlID] }
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
        if( resourceType === 'teiDoc' ) {
            for( const key of Object.keys(ids) ) {
                const childLastID = this.getHighestFacsID(ids[key])
                highestID = childLastID > highestID ? childLastID : highestID
            }
        } else {
            highestID = getHighestFacsID(ids)
        }
        return highestID + 1
    }

    getRelativeURIList( localResourceID, parentID ) {
        const uris = []

        const getURIs = (resourceID, ids, local) => {
            for( const xmlID of Object.keys(ids)) {
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
            const { resourceType, ids } = resourceMap
            if( resourceType === 'teidoc' ) {
                const local = ( resourceID === parentID )
                for( const childID of Object.keys(ids) ) {
                    getURIs(resourceID, ids[childID], local)
                }
            } else {
                const local = ( resourceID === localResourceID )
                getURIs(resourceID, ids, local)           
            }
        }
        return uris.sort()
    }

    getLocalIDs(resourceID) {
        return resourceIDToLocalIDs(resourceID,this.idMap)
    }

    isUnique(localID,parentID,xmlID=null) {
        const resourceMap = parentID ? this.idMap[parentID].ids[localID] : this.idMap[localID]
        if( resourceMap && xmlID ) {
            return !!resourceMap.ids[xmlID]
        } else {
            return !!resourceMap
        }
    }

    getUniqueID(baseID) {
        return `${baseID}-${Date.now()}`
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