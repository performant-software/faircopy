import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import {importIIIFManifest} from './iiif'
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import {teiTemplate} from "./tei-template"
import {sanitizeID} from "./attribute-validators"
import {learnDoc, saveConfig} from "./faircopy-config"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectData) {
        this.projectFilePath = projectData.projectFilePath
        this.loadManifest(projectData.fairCopyManifest)
        this.fairCopyConfig = JSON.parse(projectData.fairCopyConfig)
        this.teiSchema = new TEISchema(projectData.teiSchema)
        this.menus = this.parseMenus(projectData.menuGroups)
        this.idMap = new IDMap(this.teiSchema,projectData.idMap)
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
        this.resources = fairCopyManifest.resources
    }
    
    updateResource( resourceEntry ) {
        if( this.resources[resourceEntry.id] ) {
            this.resources[resourceEntry.id] = resourceEntry
            fairCopy.services.ipcSend('updateResource', JSON.stringify(resourceEntry) )
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

    newResource( name, localID, type, url ) {
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name, 
            type
        }
        this.resources[resourceEntry.id] = resourceEntry

        if( resourceEntry.type === 'text') {
            fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), teiTemplate )
        } else {
            importIIIFManifest(url, (xml,facs) => {
                if( xml ) {
                    fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), xml )
                    this.idMap.mapFacsIDs(localID,facs)
                    this.idMap.save()
                }
            })
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

        if( resourceEntry.type === 'text') {
            return new TEIDocument( resourceID, this )
        } else {
            return new FacsDocument( resourceID, this )
        }        
    }

    importResource(importData) {
        const { path, data } = importData

        const name = fairCopy.services.getBasename(path,'.xml').trim()
        const sanitizedID = sanitizeID(name)
        const localID = sanitizedID && !this.idMap.get(sanitizedID) ? sanitizedID : this.idMap.getUniqueID()  
        
        const resourceEntry = {
            id: uuidv4(),
            localID,
            name,
            type: 'text'
        }

        // parse the data into a ProseMirror doc
        const parser = new DOMParser();
        const tempDoc = new TEIDocument(null,this)
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
        const bodyEl = teiEl.getElementsByTagName('body')[0] || teiEl.getElementsByTagName('BODY')[0]
        if( !teiHeaderEl || !bodyEl ) {
            return { error: true, errorMessage: '<TEI> element must contain <teiHeader> and <body>.' }
        } 

        const doc = this.teiSchema.parseBody(bodyEl,tempDoc)

        this.idMap.mapTextIDs(localID,doc)
        this.fairCopyConfig = learnDoc(this.fairCopyConfig, doc, this.teiSchema, tempDoc)
        this.resources[resourceEntry.id] = resourceEntry
        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), data )
        saveConfig(this.fairCopyConfig)
        this.idMap.save()    
        return { error: false, errorMessage: null }
    }
}