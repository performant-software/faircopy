import FacsDocument from "./FacsDocument"
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import { v4 as uuidv4 } from 'uuid'

const fairCopy = window.fairCopy

export default class ImageView {

    constructor(imageViewData) {
        this.teiSchema = new TEISchema(imageViewData.teiSchema)
        this.idMap = new IDMap(this.teiSchema,imageViewData.idMap)
        this.resourceEntry = imageViewData.resourceEntry
        this.facsDocument = new FacsDocument( this.resourceEntry.id, this, imageViewData.resource )
        this.startingID = imageViewData.xmlID
        this.updateListeners = []
        this.lastResourceEntryMessage = null
        
        fairCopy.services.ipcRegisterCallback('resourceEntryUpdated', (e, d) => {
            const nextResourceEntry = JSON.parse(d.resourceEntry)
            if( this.resourceEntry.id === nextResourceEntry.id && d.messageID !== this.lastResourceEntryMessage ) 
                this.onResourceUpdated(nextResourceEntry)
        })
    }

    // Called when resource entry is updated by a different window process
    onResourceUpdated(nextResourceEntry) {
        this.resourceEntry = nextResourceEntry
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

    getLocalID() {
        return this.resourceEntry.localID
    }

    updateResource( nextResourceEntry ) {
        const currentLocalID = this.resourceEntry.localID 
        const nextLocalID = nextResourceEntry.localID
        if( currentLocalID !== nextLocalID ) {
            this.idMap.changeID(currentLocalID,nextLocalID)
            this.idMap.save()
        }        
        this.resourceEntry = { id: this.resourceEntry.id, ...nextResourceEntry }
        const messageID = uuidv4()
        fairCopy.services.ipcSend('updateResource', messageID, JSON.stringify(this.resourceEntry) )
        this.lastResourceEntryMessage = messageID
    }
}