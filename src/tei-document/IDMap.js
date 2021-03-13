import { v4 as uuidv4 } from 'uuid'
import { getThumbnailURL } from '../tei-document/iiif'

const fairCopy = window.fairCopy

export default class IDMap {

    constructor(idMapData) {
        this.lastMessageID = null
        this.updateListeners = []
        this.loadIDMap(idMapData)

        // Listen for updates
        fairCopy.services.ipcRegisterCallback('IDMapUpdated', (e, d) => {
            if( d.messageID !== this.lastMessageID ) 
                this.onUpdate(d.idMapData)
        })
    }

    // Called when ID Map is updated by a different window process
    onUpdate(idMapData) {
        this.loadIDMap(idMapData)
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

    loadIDMap(idMapData) {
        this.idMap = JSON.parse(idMapData)
    }

    mapResource( resourceType, localID, parentLocalID, content ) {
        const resourceMap = (resourceType === 'facs') ? this.mapFacsIDs(content) : this.mapTextIDs(content)

        if( parentLocalID ) {
            this.idMap[parentLocalID][localID] = resourceMap
        } else {
            this.idMap[localID] = resourceMap
        }
    }

    mapTextIDs(doc) {        
        const xmlIDs = []

        const gatherID = (element) => {
            const xmlID = element.attrs['xml:id']
            if( xmlID ) xmlIDs.push(xmlID)
        }
        
        // gather up all xml:ids and their nodes/marks
        doc.descendants((node) => {
            gatherID(node)
            for( const mark of node.marks ) {
                gatherID(mark)
            }        
            return true
        })

        const xmlIDMap = {}
        for( const id of xmlIDs ) {
            xmlIDMap[id] = { type: 'text' }
        }

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

    addResource( localID, parentID=null ) {
        if( parentID ) {
            if( this.idMap[parentID][localID] ) return false;
            this.idMap[parentID][localID] = {}
            return true    
        } else {
            if( this.idMap[localID] ) return false;
            this.idMap[localID] = {}
            return true    
        }
    }

    removeResource( localID, parentID=null ) {
        if( parentID ) {
            delete this.idMap[parentID][localID]
        } else {
            delete this.idMap[localID]
        }
    }

    // TODO works with sub resource?
    get( uri, parent ) {
        try {
            let rootPath = parent ? `${parent}/` : ''
            const url = new URL(uri, `https://uri.faircopy.com/${rootPath}`)
            if( url.hostname === 'uri.faircopy.com') {
                const localID = url.pathname.slice(1) // slice off /
                if( localID.length === 0 ) return null // relative URL w/no parent
                const xmlID = url.hash ? url.hash.slice(1) : null // slice off #
                const resourceMap = this.idMap[localID]
                if( resourceMap ) {
                    return { localID, xmlID, ...resourceMap[xmlID] }
                } 
            }   
            // local ID not found or external URL
            return null
        } catch(e) {
            // not a valid URI
            return null            
        }
    }

    // TODO works with sub resource?
    changeID( oldID, newID ) {
        if( this.idMap[oldID] ) {
            this.idMap[newID] = this.idMap[oldID]
            delete this.idMap[oldID]
        }
    }

    // TODO works with sub resource?
    getRelativeURIList( parent ) {
        const uris = []
        for( const resourceID of Object.keys(this.idMap) ) {
            for( const xmlID of Object.keys(this.idMap[resourceID])) {
                if( resourceID === parent ) {
                    uris.push(`#${xmlID}`)
                } else {
                    uris.push(`${resourceID}#${xmlID}`)
                }
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

    save() {        
        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSaveIDMap', messageID, JSON.stringify(this.idMap))
        this.lastMessageID = messageID
        console.log(JSON.stringify(this.idMap))
    }
}
