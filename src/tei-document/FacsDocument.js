
const fairCopy = window.fairCopy

export default class FacsDocument {

    constructor( resourceID ) {
        if( resourceID ) {
            this.requestResource( resourceID )
            this.resourceID = resourceID
            this.name = 'test'
        }
        this.changedSinceLastSave = false
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    load( facs ) {
        // const parser = new DOMParser();
        // this.xmlDom = parser.parseFromString(facs, "text/xml");
        // const facsEl = this.xmlDom.getElementsByTagName('facsimile')[0]
        // TODO
        this.loading = false
    }
}
