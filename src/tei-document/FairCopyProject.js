import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import {importIIIFManifest} from './iiif'
import TEISchema from "./TEISchema"
import {teiTemplate} from "./tei-template"

const fairCopy = window.fairCopy

export default class FairCopyProject {

    constructor(projectData) {
        this.projectFilePath = projectData.projectFilePath
        this.loadManifest(projectData.fairCopyManifest)
        this.fairCopyConfig = JSON.parse(projectData.fairCopyConfig)
        this.teiSchema = new TEISchema(projectData.teiSchema)
        this.menus = this.parseMenus(projectData.menuGroups)
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
            importIIIFManifest(url, (resourceData) => {
                if( resourceData ) {
                    fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), resourceData )
                }
            })
        }
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            delete this.resources[resourceID]
            fairCopy.services.ipcSend('removeResource', resourceID )
        }
    }

    openResource( resourceID ) {
        const resourceEntry = this.resources[resourceID]
        if( !resourceEntry ) return null

        if( resourceEntry.type === 'text') {
            return new TEIDocument( resourceID, this.teiSchema, this.fairCopyConfig )
        } else {
            return new FacsDocument( resourceID )
        }        
    }

    importResource(importData) {
        const { data } = importData
        // TODO base this on file path
        const simpleName = 'importtest'

        const resourceEntry = {
            id: uuidv4(),
            localID: simpleName,
            name: simpleName,
            type: 'text'
        }
        this.resources[resourceEntry.id] = resourceEntry
        fairCopy.services.ipcSend('addResource', JSON.stringify(resourceEntry), data )
    }
}