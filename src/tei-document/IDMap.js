// const fairCopy = window.fairCopy

export default class IDMap {

    constructor(teiSchema,idMapData) {
        this.teiSchema = teiSchema
        this.idMap = idMapData
    }

    addText(localID, xml) {        
        if( this.get(localID) ) return false

        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(xml, "text/xml");
        const bodyEl = xmlDom.getElementsByTagName('body')[0]
        const doc = this.teiSchema.domParser.parse(bodyEl)

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
        return true
    }

    getLocalURI( uri, parent ) {
        // TODO take uri and return a local URI 
    }

    set( uri, value ) {
        // TODO 
    }

    get( uri ) {
        // TODO retrieve the record for this URI
        return null
    }

    getRelativeURIList( parent ) {
        // TODO 
    }

    getUniqueID() {
        // TODO generate a unique ID
        return 'abcd'
    }

    save() {
        // TODO save ID map
        // fairCopy.services.ipcSend('requestSave', this.resourceID, fileContents)
        // this.changedSinceLastSave = false
    }
}
