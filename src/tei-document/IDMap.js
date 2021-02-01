import { v4 as uuidv4 } from 'uuid'
import { getThumbnailURL } from '../tei-document/iiif'

const fairCopy = window.fairCopy

export default class IDMap {

    constructor(teiSchema,idMapData) {
        this.teiSchema = teiSchema
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

    mapTextIDs(localID, doc) {        

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

        this.idMap[localID] = xmlIDMap
    }

    mapFacsIDs(localID, facs) {
        const { surfaces } = facs

        const facsIDMap = {}
        for( const surface of surfaces ) {
            const thumbnailURL = surface.type === 'iiif' ? getThumbnailURL(surface) : `local://${surface.resourceEntryID}`
            facsIDMap[surface.id] = { type: 'facs', thumbnailURL }

            for( const zone of surface.zones ) {
                facsIDMap[zone.id] = { type: 'zone' }
            }
        }

        this.idMap[localID] = facsIDMap
    }

    addResource( localID ) {
        if( this.idMap[localID] ) return false;
        this.idMap[localID] = {}
        return true
    }

    removeResource( localID ) {
        delete this.idMap[localID]
    }

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

    changeID( oldID, newID ) {
        if( this.idMap[oldID] ) {
            this.idMap[newID] = this.idMap[oldID]
            delete this.idMap[oldID]
        }
    }

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

    isUnique(testID) {
        return this.idMap[testID] === undefined
    }

    getUniqueID(baseID) {
        return `${baseID}-${Date.now()}`
    }

    save() {
        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSaveIDMap', messageID, JSON.stringify(this.idMap))
        this.lastMessageID = messageID
    }
}
