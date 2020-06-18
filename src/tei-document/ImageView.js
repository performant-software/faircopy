import FacsDocument from "./FacsDocument"
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"

export default class ImageView {

    constructor(imageViewData) {
        this.teiSchema = new TEISchema(imageViewData.teiSchema)
        this.idMap = new IDMap(this.teiSchema,imageViewData.idMap)
        this.facsDocument = new FacsDocument( imageViewData.resourceID, this, imageViewData.resource )
        this.startingID = imageViewData.xmlID
    }
}