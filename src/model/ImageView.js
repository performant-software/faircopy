import FacsDocument from "./FacsDocument"
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import { v4 as uuidv4 } from 'uuid'
import { isLoggedIn } from './cloud-api/auth'

const fairCopy = window.fairCopy

export default class ImageView {

    constructor(imageViewData) {
        this.teiSchema = new TEISchema(imageViewData.teiSchema)
        this.idMap = new IDMap(imageViewData.idMap)
        this.resourceEntry = imageViewData.resourceEntry
        this.parentEntry = imageViewData.parentEntry
        this.facsDocument = new FacsDocument( this.resourceEntry, this.parentEntry, this, imageViewData.resource )
        this.startingID = imageViewData.xmlID
        this.updateListeners = []
        this.remote = imageViewData.remote
        this.email = imageViewData.email
        this.serverURL = imageViewData.serverURL
        this.lastResourceEntryMessage = null   
    }

    onResourceEntryUpdated = (e, resourceEntry ) => {
        this.onResourceUpdated({resourceEntry})
        // also listen for updates to parent
        if( this.parentEntry && this.parentEntry.id === resourceEntry.id ) {
            this.parentEntry = resourceEntry
        }    
    }

    onResourceContentUpdated = (e, resourceID, messageID, resourceContent) => {
        this.onResourceUpdated({resourceID, messageID, resourceContent})
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('resourceEntryUpdated', this.onResourceEntryUpdated )
        fairCopy.services.ipcRegisterCallback('resourceContentUpdated', this.onResourceContentUpdated )
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('resourceEntryUpdated', this.onResourceEntryUpdated )
        fairCopy.services.ipcRegisterCallback('resourceContentUpdated', this.onResourceContentUpdated )
    }

    // Called when resource entry is updated by a different window process
    onResourceUpdated(nextResourceEntry) {
        this.resourceEntry = nextResourceEntry
        for( const listener of this.updateListeners ) {
            listener()
        }
    }

    siblingHasID(targetID) {
        if( this.parentEntry ) {
            return this.idMap.siblingHasID(targetID,this.resourceEntry.localID,this.parentEntry.localID)
        } 
        return false
    }

    addUpdateListener(listener) {
        this.updateListeners.push(listener)
    }

    removeUpdateListener(listener) {
        this.updateListeners = this.updateListeners.filter( l => l !== listener )
    }

    isLoggedIn = () => {
        if( !this.remote ) return false
        return isLoggedIn( this.email, this.serverURL )
    }

    updateResource( nextResourceEntry ) {     
        const resourceEntry = { id: this.resourceEntry.id, ...nextResourceEntry }
        const messageID = uuidv4()
        fairCopy.services.ipcSend('updateResource', messageID, JSON.stringify(resourceEntry) )
    }
}