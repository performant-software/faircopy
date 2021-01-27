import FacsDocument from "./FacsDocument"
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"

const fairCopy = window.fairCopy

export default class ImageView {

    constructor(imageViewData) {
        this.teiSchema = new TEISchema(imageViewData.teiSchema)
        this.idMap = new IDMap(this.teiSchema,imageViewData.idMap)
        this.resourceEntry = imageViewData.resourceEntry
        this.facsDocument = new FacsDocument( this.resourceEntry.id, this, imageViewData.resource )
        this.startingID = imageViewData.xmlID
    }

    updateResource( nextResourceEntry ) {
        const currentLocalID = this.resourceEntry.localID 
        const nextLocalID = nextResourceEntry.localID
        if( currentLocalID !== nextLocalID ) {
            this.idMap.changeID(currentLocalID,nextLocalID)
            this.idMap.save()
        }
        this.resourceEntry = nextResourceEntry
        fairCopy.services.ipcSend('updateResource', JSON.stringify(nextResourceEntry) )
    }
}