import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import {importIIIFManifest} from './iiif'
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import {teiHeaderTemplate, teiTextTemplate, teiDocTemplate } from "./tei-template"
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
        this.idMap = new IDMap(this.teiSchema,projectData.idMap)   
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

    getLocalID( resourceID ) {
        const resourceEntry = this.resources[resourceID]
        return resourceEntry.localID
    }

    getResourceID( localID ) {
        const resource = Object.values(this.resources).find( r => r.localID === localID)
        return ( resource ) ? resource.id : null
    }

    newResource( name, localID, type, url, onError, onSuccess ) {
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name, 
            type
        }

        if( resourceEntry.type === 'teidoc' ) {
            const headerEntry = {
                id: uuidv4(),
                localID: 'header',
                name: 'TEI Header', 
                type: 'header'
            }                
            // create a header resource 
            fairCopy.services.ipcSend('addResource', JSON.stringify(headerEntry), teiHeaderTemplate )

            // next, create teidoc resource
            this.resources[resourceEntry.id] = resourceEntry
            fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), teiDocTemplate(headerEntry.id) )
            this.idMap.addResource(localID)
            this.idMap.save()
        } else if( resourceEntry.type === 'text' ) {
            this.resources[resourceEntry.id] = resourceEntry
            fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), teiTextTemplate )
            this.idMap.addResource(localID)
            this.idMap.save()
        } else {
            if( url && url.length > 0 ) {
                importIIIFManifest(url, onError, (xml,facs) => {
                    if( xml ) {
                        this.resources[resourceEntry.id] = resourceEntry
                        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), xml )
                        this.idMap.mapFacsIDs(localID,facs)
                        this.idMap.save()
                        onSuccess()
                    }
                })    
            } else {
                // add a blank facs 
                this.resources[resourceEntry.id] = resourceEntry
                const facs = { surfaces: [] }
                const xml = facsTemplate(facs)
                fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), xml )
                this.idMap.mapFacsIDs(localID,facs)
                this.idMap.save()
            }
        }
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const {localID} = this.resources[resourceID]
            this.idMap.removeResource(localID)
            delete this.resources[resourceID]
            fairCopy.services.ipcSend('removeResource', resourceID )
        }
        this.idMap.save()
    }

    openResource( resourceID ) {
        const resourceEntry = this.resources[resourceID]
        if( !resourceEntry ) return null

        if( resourceEntry.type === 'text' || resourceEntry.type === 'header' ) {
            return new TEIDocument( resourceID, resourceEntry.type, this )
        } else {
            return new FacsDocument( resourceID, this )
        }        
    }

    importResource(importData) {
        const { path, data } = importData

        const name = fairCopy.services.getBasename(path,'.xml').trim()
        const sanitizedID = sanitizeID(name)
        const localID = sanitizedID && !this.idMap.get(sanitizedID) ? sanitizedID : this.idMap.getUniqueID(sanitizedID)  
        
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name,
            type: 'text'
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

        this.idMap.mapTextIDs(localID,doc)
        this.fairCopyConfig = learnDoc(this.fairCopyConfig, doc, this.teiSchema, tempDoc)
        this.resources[resourceEntry.id] = resourceEntry
        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), data )
        saveConfig(this.fairCopyConfig)
        this.idMap.save()    
        return { error: false, errorMessage: null }
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
}