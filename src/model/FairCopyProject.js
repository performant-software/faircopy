import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import {importIIIFManifest} from './iiif'
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import {teiHeaderTemplate, teiTextTemplate, teiStandOffTemplate } from "./tei-template"
import {saveConfig} from "./faircopy-config"
import {facsTemplate} from "./tei-template"
import {importResource} from "./import-tei"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectData) {
        this.projectFilePath = projectData.projectFilePath
        this.loadManifest(projectData.fairCopyManifest)
        this.fairCopyConfig = JSON.parse(projectData.fairCopyConfig)
        this.baseConfigJSON = projectData.baseConfig
        this.teiSchema = new TEISchema(projectData.teiSchema)
        this.idMap = new IDMap(projectData.idMap)   
        this.updateListeners = []
        this.lastResourceEntryMessage = null 
        
        // Listen for updates to resource entries.
        fairCopy.services.ipcRegisterCallback('resourceEntryUpdated', (e, d) => {
            if( d.deleted ) {
                delete this.resources[d.resourceID]
            } else {
                const nextResourceEntry = JSON.parse(d.resourceEntry)
                this.resources[ nextResourceEntry.id ] = nextResourceEntry
            }
            for( const listener of this.updateListeners ) {
                listener()
            }
        })
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
        // filter out images, which are part of facs 
        this.resources = {}
        Object.values(fairCopyManifest.resources).forEach( entry => {
            if( entry.type !== 'image' ) this.resources[entry.id] = entry
        })
    }

    getResources(parentResource) {
        const selectedResources = {}
        if( parentResource ) {
            for( const resourceID of parentResource.resources ) {
                const resource = this.resources[resourceID]
                selectedResources[resource.id] = resource
            }
        } else {
            for( const resource of Object.values(this.resources) ) {
                if( !resource.parentResource ) selectedResources[resource.id] = resource
            }
        }
        return selectedResources
    }
    
    updateResource( resourceEntry ) {
        if( this.resources[resourceEntry.id] ) {
            const messageID = uuidv4()
            fairCopy.services.ipcSend('updateResource', messageID, JSON.stringify(resourceEntry) )
            this.lastResourceEntryMessage = messageID
        } else {
            console.log(`Unable to update resource: ${resourceEntry}`)
        }
    }

    getResourceID = ( localID ) => {
        const resource = Object.values(this.resources).find( r => r.localID === localID)
        return ( resource ) ? resource.id : null
    }

    getResourceEntry( resourceID ) {
        return this.resources[resourceID]
    }

    getParent = ( resourceEntry ) => {
        return resourceEntry ? resourceEntry.parentResource ? this.resources[resourceEntry.parentResource] : null : null
    }

    importIIIF( url, parentResourceID, onError, onSuccess ) {     
        const parentEntry = this.getResourceEntry(parentResourceID)
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
                parentResource: parentResourceID
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
            parentResource: parentResourceID
        }

        if( type === 'teidoc' ) {
            const headerEntry = {
                id: uuidv4(),
                localID: 'header',
                name: 'TEI Header', 
                type: 'header',
                parentResource: resourceEntry.id
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
        } else if( type === 'standoff') {
            this.addResource(resourceEntry, teiStandOffTemplate, this.idMap.getBlankResourceMap(false))
        } else {
            throw new Error("Attempted to create unknown document type.")
        }
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const {parentResource,resources} = this.resources[resourceID]

            // if there are child resources, remove them too
            if( resources ) this.removeResources( resources )

            // if this is a child resource, remove it from parent
            if( parentResource ) {
                const parent = this.resources[parentResource]
                parent.resources = parent.resources.filter(r => r !== resourceID)
                this.updateResource( parent )        
            } 
            fairCopy.services.ipcSend('removeResource', resourceID )
        }
    }

    openResource( resourceID ) {
        const resourceEntry = this.resources[resourceID]
        if( !resourceEntry ) return null

        if( resourceEntry.type === 'text' || resourceEntry.type === 'header' ) {
            return new TEIDocument( resourceID, resourceEntry.type, this )
        } else if( resourceEntry.type === 'facs' ) {
            return new FacsDocument( resourceID, this )
        } 
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
            return { error: false, errorMessage: null }
        } catch(e) {
            return { error: true, errorMessage: e.message }
        }        
    }

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
        const { id, parentResource } = resourceEntry

        this.resources[id] = resourceEntry

        if( parentResource ) {
            const parent = this.resources[parentResource]
            if( !parent.resources ) parent.resources = []
            parent.resources.push(id)
            this.updateResource( parent )    
        }

        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), content, JSON.stringify(resourceMap) )
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

    siblingHasID(targetID, resourceID) {
        const resourceEntry = this.resources[resourceID]
        if( resourceEntry.parentResource ) {
            const parentEntry = this.resources[resourceEntry.parentResource]
            return this.idMap.siblingHasID(targetID,resourceEntry.localID,parentEntry.localID)
        }    
        return false
    }
}