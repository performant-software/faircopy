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
            xmlIDMap[id] = 'text'
        }

        this.idMap[localID] = xmlIDMap
    }

    mapFacsIDs(localID, facs) {
        const { surfaces } = facs

        const facsIDs = surfaces.map(s => s.id)

        const sortedIDs = facsIDs.sort()
        const facsIDMap = {}
        for( const id of sortedIDs ) {
            facsIDMap[id] = 'facs'
        }

        this.idMap[localID] = facsIDMap
    }

    get( id, localID ) {
        const resourceMap = this.idMap[localID]
        if( resourceMap ) {
            return resourceMap[id]
        }
        return null
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
