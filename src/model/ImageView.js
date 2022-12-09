import FacsDocument from "./FacsDocument"
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import { isEntryEditable } from "./FairCopyProject"
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
        this.userID = imageViewData.userID
        this.serverURL = imageViewData.serverURL
        this.permissions = imageViewData.permissions
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

    onUpdateProjectInfo = ( projectInfo ) => {
        this.permissions = projectInfo.permissions
    }

    componentDidMount() {
        fairCopy.services.ipcRegisterCallback('resourceEntryUpdated', this.onResourceEntryUpdated )
        fairCopy.services.ipcRegisterCallback('resourceContentUpdated', this.onResourceContentUpdated )
        fairCopy.services.ipcRegisterCallback('updateProjectInfo', this.onUpdateProjectInfo )
    }

    componentWillUnmount() {
        fairCopy.services.ipcRemoveListener('resourceEntryUpdated', this.onResourceEntryUpdated )
        fairCopy.services.ipcRemoveListener('resourceContentUpdated', this.onResourceContentUpdated )
        fairCopy.services.ipcRemoveListener('updateProjectInfo', this.onUpdateProjectInfo )
    }

    // Called when resource entry is updated by a different window process
    onResourceUpdated(nextResourceEntry) {
        this.resourceEntry = nextResourceEntry
        for( const listener of this.updateListeners ) {
            listener()
        }
    }

    isUnique(targetID,localID, parentID) {
        return ( this.idMap.getResourceEntry(localID,parentID,targetID) === null )
    }

    addUpdateListener(listener) {
        this.updateListeners.push(listener)
    }

    removeUpdateListener(listener) {
        this.updateListeners = this.updateListeners.filter( l => l !== listener )
    }

    isLoggedIn = () => {
        if( !this.remote ) return false
        return isLoggedIn( this.userID, this.serverURL )
    }

    isEditable = ( resourceEntry ) => {
        // can always edit in a local project
        if( !this.remote ) return true
        return isEntryEditable(resourceEntry, this.userID )
    }

    updateResource( nextResourceEntry ) {     
        const resourceEntry = { id: this.resourceEntry.id, ...nextResourceEntry }
        const messageID = uuidv4()
        fairCopy.services.ipcSend('updateResource', messageID, JSON.stringify(resourceEntry) )
    }
}