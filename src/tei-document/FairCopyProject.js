import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import {importIIIFManifest} from './iiif'
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import {teiHeaderTemplate, teiTextTemplate } from "./tei-template"
import {sanitizeID} from "./attribute-validators"
import {learnDoc, saveConfig} from "./faircopy-config"
import {facsTemplate} from "./tei-template"
import {parseText} from "./xml"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectData) {
        this.projectFilePath = projectData.projectFilePath
        this.loadManifest(projectData.fairCopyManifest)
        this.fairCopyConfig = JSON.parse(projectData.fairCopyConfig)
        this.teiSchema = new TEISchema(projectData.teiSchema)
        this.menus = this.parseMenus(projectData.menuGroups)
        this.headerMenus = this.parseMenus(projectData.headerMenuGroups)
        this.idMap = new IDMap(projectData.idMap)   
        this.updateListeners = []
        this.lastResourceEntryMessage = null 
        
        // Listen for updates to resource entries.
        fairCopy.services.ipcRegisterCallback('resourceEntryUpdated', (e, d) => {
            const nextResourceEntry = JSON.parse(d.resourceEntry)
            if( d.messageID !== this.lastResourceEntryMessage ) {
                this.onResourceUpdated(nextResourceEntry)
            }
        })
    }

    // Called when resource entry is updated by a different window process
    onResourceUpdated(nextResourceEntry) {
        this.resources[ nextResourceEntry.id ] = nextResourceEntry
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

    parseMenus(json) {
        const menuData = JSON.parse(json)

        const menus = {}
        for( const menuID of Object.keys(menuData) ) {
            menus[menuID] = this.parseMenu(menuData[menuID])
        }

        return menus
    }

    parseMenu(menuEntries) {
        const menuGroups = {}
        for( const menuEntry of menuEntries ) {
            // which ones are enabled?
            const members = []
            for( const member of menuEntry.members ) {
                const enabled = ( this.teiSchema.elements[member] !== undefined )
                members.push({ id: member, enabled })
            }
            menuEntry.members = members
            menuGroups[menuEntry.id] = menuEntry
        }

        return menuGroups
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
            const currentLocalID = this.resources[resourceEntry.id].localID
            if( resourceEntry.localID !== currentLocalID ) {
                this.idMap.changeID(currentLocalID,resourceEntry.localID)
                this.idMap.save()
            }
            this.resources[resourceEntry.id] = resourceEntry
            const messageID = uuidv4()
            fairCopy.services.ipcSend('updateResource', messageID, JSON.stringify(resourceEntry) )
            this.lastResourceEntryMessage = messageID
        } else {
            console.log(`Unable to update resource: ${resourceEntry}`)
        }
    }

    getLocalID = ( resourceID ) => {
        const resourceEntry = this.resources[resourceID]
        return ( resourceEntry ) ? resourceEntry.localID : null
    }

    getResourceID = ( localID ) => {
        const resource = Object.values(this.resources).find( r => r.localID === localID)
        return ( resource ) ? resource.id : null
    }

    newResource( name, localID, type, url, parentResourceID, onError, onSuccess ) {
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name, 
            type,
            parentResource: parentResourceID
        }

        if( type === 'facs' && url && url.length > 0 ) {
            importIIIFManifest(url, onError, (xml,facs) => {
                if( xml ) {
                    this.addResource(resourceEntry, xml)
                    this.idMap.mapFacsIDs(localID,facs)
                    this.idMap.save()
                    onSuccess()
                }
            })    
        } else {
            if( type === 'teidoc' ) {
                const headerEntry = {
                    id: uuidv4(),
                    localID: 'header',
                    name: 'TEI Header', 
                    type: 'header',
                    parentResource: resourceEntry.id
                }    
                this.addResource(resourceEntry, "" )
                this.addResource(headerEntry, teiHeaderTemplate(name))

            } else if( type === 'text' ) {
                this.addResource(resourceEntry, teiTextTemplate)
            } else {
                // add a blank facs 
                const facs = { surfaces: [] }
                const xml = facsTemplate(facs)
                this.addResource(resourceEntry,xml)
            }    

            onSuccess()
        }
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const {localID,parentResource,resources} = this.resources[resourceID]

            // if there are child resources, remove them too
            if( resources ) this.removeResources( resources )
            delete this.resources[resourceID]

            // if this is a child resource, remove it from parent
            if( parentResource ) {
                const parent = this.resources[parentResource]
                parent.resources = parent.resources.filter(r => r !== resourceID)
                this.updateResource( parentResource )        
                this.idMap.removeResource(localID, parent.localID)
            } else {
                this.idMap.removeResource(localID)
            }
            fairCopy.services.ipcSend('removeResource', resourceID )
        }
        this.idMap.save()
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
        const { path, data } = importData

        const name = fairCopy.services.getBasename(path,'.xml').trim()
        const sanitizedID = sanitizeID(name)
        const localID = sanitizedID && !this.idMap.get(sanitizedID) ? sanitizedID : this.idMap.getUniqueID(sanitizedID)  
        
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name,
            type: 'text',
            parentResource: parentResourceID
        }

        // parse the data into a ProseMirror doc
        const parser = new DOMParser();
        const tempDoc = new TEIDocument(null,'text',this)
        const xmlDom = parser.parseFromString(data, "text/xml");

        // Check for basic validity 
        if( xmlDom.getElementsByTagName('parsererror').length > 0 ) {
            return { error: true, errorMessage: 'Document is not a well formed XML document.' }
        } 

        const teiEl = xmlDom.getElementsByTagName('tei')[0] || xmlDom.getElementsByTagName('TEI')[0]
        if( !teiEl ) {
            return { error: true, errorMessage: 'Document must contain a <TEI> element.' }
        }
        const teiHeaderEl = teiEl.getElementsByTagName('teiheader')[0] || teiEl.getElementsByTagName('teiHeader')[0]

        // TODO handle import of facs 
        const textEl = teiEl.getElementsByTagName('text')[0] || teiEl.getElementsByTagName('TEXT')[0]
        if( !teiHeaderEl || !textEl ) {
            return { error: true, errorMessage: '<TEI> element must contain <teiHeader> and <text>.' }
        } 

        const doc = parseText(textEl,tempDoc,this.teiSchema)

        const parent = this.resources[parentResourceID]
        this.idMap.mapResource( 'text', localID, parent.localID, doc )
        this.fairCopyConfig = learnDoc(this.fairCopyConfig, doc, this.teiSchema, tempDoc)
        this.resources[resourceEntry.id] = resourceEntry
        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), data )
        saveConfig(this.fairCopyConfig)
        this.idMap.save()    

        if( parentResourceID ) {
            this.addChild( parentResourceID, resourceEntry.id )
        }

        return { error: false, errorMessage: null }
    }

    addResource( resourceEntry, content ) {
        const { id, localID, parentResource } = resourceEntry

        this.resources[id] = resourceEntry

        if( parentResource ) {
            const parent = this.resources[parentResource]
            if( !parent.resources ) parent.resources = []
            parent.resources.push(id)
            this.idMap.addResource(localID,parent.localID)
            this.updateResource( parent )    
            this.idMap.save()
        } else {
            this.idMap.addResource(localID)
            this.idMap.save()
        }

        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), content )
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