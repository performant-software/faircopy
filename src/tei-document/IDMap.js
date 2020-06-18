import { getThumbnailURL } from '../tei-document/iiif'

const fairCopy = window.fairCopy

export default class IDMap {

    constructor(teiSchema,idMapData) {
        this.teiSchema = teiSchema
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

        const sortedIDs = xmlIDs.sort()
        const xmlIDMap = {}
        for( const id of sortedIDs ) {
            xmlIDMap[id] = { type: 'text' }
        }

        this.idMap[localID] = xmlIDMap
    }

    mapFacsIDs(localID, facs) {
        const { surfaces } = facs

        const facsIDMap = {}
        for( const surface of surfaces ) {
            const thumbnailURL = getThumbnailURL(surface)
            facsIDMap[surface.id] = { type: 'facs', thumbnailURL }
        }

        this.idMap[localID] = facsIDMap
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
        return uris
    }

    getUniqueID() {
        // TODO generate a unique ID
        return 'abcd'
    }

    save() {
        fairCopy.services.ipcSend('requestSaveIDMap', JSON.stringify(this.idMap))
    }
}
