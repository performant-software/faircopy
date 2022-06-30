import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import {importIIIFManifest} from './iiif'
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import {teiHeaderTemplate, teiTextTemplate, teiStandOffTemplate, teiSourceDocTemplate } from "./tei-template"
import {saveConfig} from "./faircopy-config"
import {facsTemplate} from "./tei-template"
import {importResource} from "./import-tei"

import { isLoggedIn } from './cloud-api/auth'

const fairCopy = window.fairCopy

// initial state of a new resource as it relates to cloud
export const cloudInitialConfig = {
    local: true,
    deleted: false,
    gitHeadRevision: null,
    lastAction: null
}

export default class FairCopyProject {

    constructor(projectData) {
        this.projectFilePath = projectData.projectFilePath
        this.loadManifest(projectData.fairCopyManifest)
        this.fairCopyConfig = JSON.parse(projectData.fairCopyConfig)
        this.baseConfigJSON = projectData.baseConfig
        this.teiSchema = new TEISchema(projectData.teiSchema)
        this.idMap = new IDMap(projectData.idMap)   
        this.updateListeners = []
        this.openResourceEntries = {}
        
        // Listen for updates to resource entries.
        fairCopy.services.ipcRegisterCallback('resourceEntryUpdated', (e, resourceEntry) => this.notifyListeners(resourceEntry) )
    }

    notifyListeners(resourceEntry) {
        if( this.openResourceEntries[resourceEntry.id] ) {
            this.openResourceEntries[resourceEntry.id] = resourceEntry
        }    

        for( const listener of this.updateListeners ) {
            listener(resourceEntry)
        }
    }

    onResourceOpened(resourceEntry, resourceData) {
        const{ id, type } = resourceEntry
        this.openResourceEntries[id] = resourceEntry

        // for teidocs, just record resource entry and return
        if( type === 'teidoc' ) {
            return null 
        }
        
        let resource = null
        if( type === 'text' || type === 'header' || type === 'standOff' || type === 'sourceDoc' ) {
            resource = new TEIDocument( id, resourceEntry.type, this, null, false )
        } else if( type === 'facs' ) {
            resource = new FacsDocument( id, this, null, false )
        } else {
            throw new Error("Tried to open unknown resource type.")
        }

        resource.load(resourceData)
        return resource
    }

    onResourceClosed(resourceID) {
        if( this.openResourceEntries[resourceID] ) {
            delete this.openResourceEntries[resourceID]
        }
    }

    addUpdateListener(listener) {
        this.updateListeners.push(listener)
    }

    removeUpdateListener(listener) {
        this.updateListeners = this.updateListeners.filter( l => l !== listener )
    }

    loadManifest(json) {
        const fairCopyManifest = JSON.parse(json)
        this.projectName = fairCopyManifest.projectName
        this.description = fairCopyManifest.description
        this.remote = fairCopyManifest.remote
        this.serverURL = fairCopyManifest.serverURL
        this.email = fairCopyManifest.email
        this.projectID = fairCopyManifest.projectID
    }
    
    updateResource( resourceEntry ) {
        fairCopy.services.ipcSend('updateResource', resourceEntry )
    }

    getResourceEntry( resourceID ) {
        const resourceEntry = this.openResourceEntries[resourceID]
        return !resourceEntry ? null : resourceEntry
    }

    getParent = ( resourceEntry ) => {
        return resourceEntry ? resourceEntry.parentResource ? this.getResourceEntry(resourceEntry.parentResource) : null : null
    }

    importIIIF( url, parentResourceID, onError, onSuccess ) {    
        const parentEntry = parentResourceID ? this.getResourceEntry(parentResourceID) : null
        const nextSurfaceID = parentEntry ? this.idMap.nextSurfaceID(parentEntry.localID) : 0

        importIIIFManifest(url, nextSurfaceID, onError, (xml,facs,metadata) => {
            const { name, localID } = metadata
            const conflictingID = parentEntry ? this.idMap.idMap[parentEntry.localID][localID] : this.idMap.idMap[localID]
            const uniqueID = !conflictingID ? localID : this.idMap.getUniqueID(localID)  
            const resourceEntry = {
                id: uuidv4(),
                name,
                localID: uniqueID,
                type: 'facs',
                parentResource: parentResourceID,
                ...cloudInitialConfig
            }
    
            const resourceMap = this.idMap.mapResource( 'facs', facs )
            this.addResource(resourceEntry, xml, resourceMap)
            onSuccess()
        })    
    }

    newResource( name, localID, type, parentResourceID ) {
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name, 
            type,
            parentResource: parentResourceID,
            ...cloudInitialConfig
        }

        if( type === 'teidoc' ) {
            const headerEntry = {
                id: uuidv4(),
                localID: 'header',
                name: 'TEI Header', 
                type: 'header',
                remote: false,
                parentResource: resourceEntry.id,
                ...cloudInitialConfig
            }    
            this.addResource(resourceEntry, "", this.idMap.getBlankResourceMap(true))
            this.addResource(headerEntry, teiHeaderTemplate(name), this.idMap.getBlankResourceMap(false))
        } else if( type === 'text' ) {
            this.addResource(resourceEntry, teiTextTemplate, this.idMap.getBlankResourceMap(false))
        } else if( type === 'facs' ) {
            // add a blank facs 
            const facs = { surfaces: [] }
            const xml = facsTemplate(facs)
            this.addResource(resourceEntry,xml,this.idMap.getBlankResourceMap(false))
        } else if( type === 'standOff') {
            this.addResource(resourceEntry, teiStandOffTemplate, this.idMap.getBlankResourceMap(false))
        } else if( type === 'sourceDoc') {
            this.addResource(resourceEntry, teiSourceDocTemplate, this.idMap.getBlankResourceMap(false)) 
        } else {
            throw new Error("Attempted to create unknown document type.")
        }
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            fairCopy.services.ipcSend('removeResource', resourceID )
        }
    }

    recoverResources(resourceIDs) {
        for( const resourceID of resourceIDs ) {
            fairCopy.services.ipcSend('recoverResource', resourceID )
        }
    }  

    openResource( resourceID ) {
        fairCopy.services.ipcSend('openResource', resourceID )
    }

    importResource(importData,parentResourceID) {
        try {
            const { resources, fairCopyConfig } = importResource(importData,parentResourceID,this)
            for( const resource of resources ) {
                const { resourceEntry, content, resourceMap } = resource
                this.addResource( resourceEntry, content, resourceMap )
            }
            this.fairCopyConfig = fairCopyConfig
            saveConfig(fairCopyConfig)
            return { error: false, errorMessage: null, resourceCount: resources.length }
        } catch(e) {
            return { error: true, errorMessage: e.message, resourceCount: 0 }
        }        
    }

    // TODO REFACTOR
    // take the resources and move them into the parent ID
    moveResources( resourceIDs, targetParentID ) {
        const updatedResources = {}

        const checkoutResource = (resourceID) => {
            return updatedResources[resourceID] ? updatedResources[resourceID] : { ...this.resources[resourceID] }
        }

        const checkinResource = (resource) => {
            updatedResources[resource.id] = resource
        }

        for( const resourceID of resourceIDs ) {
            const resourceEntry = checkoutResource(resourceID)
            if( resourceEntry.parentResource === targetParentID ) continue

            // first remove the resource from current parent
            if( resourceEntry.parentResource ) {
                const parent = checkoutResource(resourceEntry.parentResource)
                parent.resources = parent.resources.filter( id => id !== resourceID )
                checkinResource(parent)
            }

            if( targetParentID ) {
                // add resource to new parent
                const targetParent = checkoutResource(targetParentID)

                // is localID unique in this context?
                for( const siblingResourceID of targetParent.resources ) {
                    const siblingResource = checkoutResource(siblingResourceID)
                    if( resourceEntry.localID === siblingResource.localID ) {
                        // make localID unique
                        resourceEntry.localID = this.idMap.getUniqueID(resourceEntry.localID)
                    }
                }

                // add resource to target parent
                targetParent.resources = !targetParent.resources ? [resourceID] : targetParent.resources.concat( resourceID )
                checkinResource( targetParent )    
            } 

            // update resource
            resourceEntry.parentResource = targetParentID
            checkinResource( resourceEntry )
        }

        // to prevent racing with main thread, only update the resources once they are final
        for( const resource of Object.values(updatedResources) ) {
            this.updateResource(resource)
        }
    }

    addResource( resourceEntry, content, resourceMap ) {
        fairCopy.services.ipcSend('addResource', resourceEntry, content, resourceMap )
    }

    updateProjectInfo( projectInfo ) {
        this.projectName = projectInfo.name
        this.description = projectInfo.description

        // if this project is in the recent projects list, update its info in localStorage
        let projects = localStorage.getItem('recentProjects');
        projects = projects ? JSON.parse(projects) : []
        const recentProjectData = projects.find( (project) => project.projectFilePath === this.projectFilePath )
        if( recentProjectData ) {
            recentProjectData.projectName = this.projectName
            recentProjectData.description = this.description
            localStorage.setItem('recentProjects', JSON.stringify(projects));
        }

        fairCopy.services.ipcSend('updateProjectInfo', JSON.stringify(projectInfo) )
    }

    // TODO REFACTOR
    siblingHasID(targetID, resourceID) {
        const resourceEntry = this.resources[resourceID]
        if( resourceEntry.parentResource ) {
            const parentEntry = this.resources[resourceEntry.parentResource]
            return this.idMap.siblingHasID(targetID,resourceEntry.localID,parentEntry.localID)
        }    
        return false
    }

    areEditable = ( resourceIDs ) => {
        for( const resourceID of resourceIDs ) {
            if( !this.isEditable(resourceID) ) return false
        }
        return true
    }

    isEditable = ( resourceID ) => {
        // can always edit in a local project
        if( !this.remote ) return true
        
        const resourceEntry = this.getResourceEntry(resourceID)
        return isEntryEditable(resourceEntry, this.email )
    }

    isLoggedIn = () => {
        if( !this.remote ) return false
        return isLoggedIn( this.email, this.serverURL )
    }
}

export function isEntryEditable( resourceEntry, email ) {        
    if( resourceEntry.local ) return true
    if( resourceEntry.deleted ) return false

    // can only edit files checked out by me
    const { lastAction } = resourceEntry
    const { action_type: actionType, user } = lastAction
    const { email: actor } = user
    return actionType === 'check_out' && actor === email
}