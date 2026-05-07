import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import FacsDocument from "./FacsDocument"
import TEISchema from "./TEISchema"
import IDMap from "./IDMap"
import {teiHeaderTemplate, teiTextTemplate, teiStandOffTemplate, teiSourceDocTemplate } from "./tei-template"
import {saveConfig, updateColorCodingStyles} from "./faircopy-config"
import {facsTemplate} from "./tei-template"
import {importResource} from "./import-tei"
import { getBlankResourceMap, getUniqueResourceID } from './id-map'
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
        this.fairCopyConfig = projectData.fairCopyConfig
        updateColorCodingStyles( this.fairCopyConfig.colorCodings )
        this.baseConfigJSON = projectData.baseConfig
        this.teiSchema = new TEISchema(projectData.teiSchema)
        this.idMap = new IDMap(projectData.idMap)   
        this.updateListeners = []
    }

    notifyListeners(messageType,resource) {
        for( const listener of this.updateListeners ) {
            listener(messageType,resource)
        }
    }

    onResourceOpened(resourceEntry, parentEntry, resourceData) {
        const{ type } = resourceEntry

        // for teidocs, just record resource entry and return
        if( type === 'teidoc' ) {
            return null 
        }
        
        let resource = null
        if( type === 'text' || type === 'header' || type === 'standOff' || type === 'sourceDoc' ) {
            resource = new TEIDocument( resourceEntry, parentEntry, this )
            this.addUpdateListener(resource.onResourceUpdated)
            resource.load(resourceData)
        } else if( type === 'facs' ) {
            resource = new FacsDocument( resourceEntry, parentEntry, this, resourceData )
            this.addUpdateListener(resource.onResourceUpdated)
        } else {
            throw new Error("Tried to open unknown resource type.")
        }

        return resource
    }

    onResourceClosed(resource) {
        this.removeUpdateListener(resource.onResourceUpdated)
    }

    addUpdateListener(listener) {
        this.updateListeners.push(listener)
    }

    removeUpdateListener(listener) {
        this.updateListeners = this.updateListeners.filter( l => l !== listener )
    }

    previewResource(resourceEntry) {
        const { projectCSS } = this.fairCopyConfig
        fairCopy.ipcSend('requestPreviewView', { resourceEntry, projectCSS })
    }

    loadManifest(fairCopyManifest) {
        this.projectName = fairCopyManifest.projectName
        this.description = fairCopyManifest.description
        this.remote = fairCopyManifest.remote
        this.serverURL = fairCopyManifest.serverURL
        this.ssoURL = fairCopyManifest.ssoURL
        this.userID = fairCopyManifest.userID
        this.projectID = fairCopyManifest.projectID
        this.permissions = fairCopyManifest.permissions
        this.configLastAction = fairCopyManifest.configLastAction
        this.orphanedResources = this.getOrphanedResources(fairCopyManifest.resources)
    }
    
    updateResource( resourceEntry ) {
        fairCopy.ipcSend('updateResource', resourceEntry )
    }

    getNextSurfaceID(parentEntry) {
        return parentEntry ? this.idMap.nextSurfaceID(parentEntry.localID) : 0   
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
            this.addResource(resourceEntry, "", getBlankResourceMap(resourceEntry.id, resourceEntry.type))
            this.addResource(headerEntry, teiHeaderTemplate(name), getBlankResourceMap(headerEntry.id, headerEntry.type))
        } else if( type === 'text' ) {
            this.addResource(resourceEntry, teiTextTemplate, getBlankResourceMap(resourceEntry.id, resourceEntry.type))
        } else if( type === 'facs' ) {
            // add a blank facs 
            const facs = { surfaces: [] }
            const xml = facsTemplate(facs)
            this.addResource(resourceEntry,xml,getBlankResourceMap(resourceEntry.id, resourceEntry.type))
        } else if( type === 'standOff') {
            this.addResource(resourceEntry, teiStandOffTemplate, getBlankResourceMap(resourceEntry.id, resourceEntry.type))
        } else if( type === 'sourceDoc') {
            this.addResource(resourceEntry, teiSourceDocTemplate, getBlankResourceMap(resourceEntry.id, resourceEntry.type)) 
        } else {
            throw new Error("Attempted to create unknown document type.")
        }
        return resourceEntry
    }

    removeResources( resourceIDs ) {
        fairCopy.ipcSend('removeResources', resourceIDs )
    }

    recoverResources(resourceIDs) {
        fairCopy.ipcSend('recoverResources', resourceIDs )
    }  

    openResource( resourceID ) {
        fairCopy.ipcSend('openResource', resourceID )
    }

    async importResource(importData,parentEntry) {
        try {
            const resources = await importResource(importData,parentEntry,this)
            if( importData.options?.replaceResource ) {
                if( resources.length > 1 ) {
                    fairCopy.ipcSend( 'replaceTEIDocument', resources )
                } else {
                    fairCopy.ipcSend( 'replaceResource', resources[0], parentEntry )
                }
            } else {
                for( const resource of resources ) {
                    const { resourceEntry, content, resourceMap } = resource
                    this.addResource( resourceEntry, content, resourceMap )
                }    
            }
            return { error: false, errorMessage: null, resourceCount: resources.length }
        } catch(e) {
            return { error: true, errorMessage: e.message, resourceCount: 0 }
        }        
    }

    saveFairCopyConfig( nextFairCopyConfig=null, lastAction=null ) {
        if( nextFairCopyConfig ) {
            this.fairCopyConfig = nextFairCopyConfig
            updateColorCodingStyles( this.fairCopyConfig.colorCodings )
        }
        if( lastAction ) {
            this.configLastAction = lastAction
        }
        saveConfig(this.fairCopyConfig, lastAction)
    }

    checkInConfig( nextFairCopyConfig ) {
        this.fairCopyConfig = nextFairCopyConfig
        updateColorCodingStyles( this.fairCopyConfig.colorCodings )
        const firstAction = !!this.configLastAction.firstAction
        fairCopy.ipcSend('checkInConfig', nextFairCopyConfig, firstAction)
    }

    checkOutConfig() {
        if( !this.configLastAction ) {
            // if there's no last action, that means server doesn't have config, consider it checked out
            const lastAction = { action_type: 'check_out', user: { id: this.userID }, firstAction: true }
            this.configLastAction = lastAction
            saveConfig( this.fairCopyConfig, lastAction )
            return true
        } else {
            // note: state is updated once we hear that the check out was a success    
            fairCopy.ipcSend('checkOutConfig')    
            return false
        }
    }
    
    configCheckedOut() {
        // create a synthentic lastAction to keep until we get a real one from server. 
        this.configLastAction = { action_type: 'check_out', user: { id: this.userID } }
        saveConfig( this.fairCopyConfig, this.configLastAction )
    }

    // take the resources and move them into the parent ID
    moveResources( resourceEntries, targetParentEntry ) {
        for( const resourceEntry of resourceEntries ) {
            if( resourceEntry.parentResource === targetParentEntry?.id ) continue

            if( targetParentEntry ) {
                const childLocalIDs = Object.keys(this.idMap.idMap[targetParentEntry.localID].ids)
                resourceEntry.localID = getUniqueResourceID( resourceEntry.type, childLocalIDs, resourceEntry.localID )
                resourceEntry.parentResource = targetParentEntry.id
            } else {
                const childLocalIDs = Object.keys(this.idMap.idMap)
                resourceEntry.localID = getUniqueResourceID( resourceEntry.type, childLocalIDs, resourceEntry.localID )
                resourceEntry.parentResource = null
            }

            // update resource
            this.updateResource( resourceEntry )
        }
    }

    addResource( resourceEntry, content, resourceMap ) {
        fairCopy.ipcSend('addResource', resourceEntry, content, resourceMap )
    }

    getProjectInfo() {
        return { 
            name: this.projectName, 
            description: this.description, 
            hasDraftCss: this.hasDraftCss,
            hasPublishedCss: this.hasPublishedCss,
            projectFilePath: this.projectFilePath,
            userID: this.userID,
            serverURL: this.serverURL,
            remote: this.remote,
            permissions: [ ...this.permissions ]
        } 
    }

    updateProjectInfo( projectInfo ) {
        this.projectName = projectInfo.name
        this.description = projectInfo.description
        this.permissions = projectInfo.permissions
        this.hasDraftCss = projectInfo.hasDraftCss
        this.hasPublishedCss = projectInfo.hasPublishedCss

        // if this project is in the recent projects list, update its info in localStorage
        let projects = localStorage.getItem('recentProjects');
        projects = projects ? JSON.parse(projects) : []
        const recentProjectData = projects.find( (project) => project.projectFilePath === this.projectFilePath )
        if( recentProjectData ) {
            recentProjectData.projectName = this.projectName
            recentProjectData.description = this.description
            localStorage.setItem('recentProjects', JSON.stringify(projects));
        }
        fairCopy.ipcSend('updateProjectInfo', projectInfo )
    }

    hasID(xmlID, localID) {
        return this.idMap.hasID(xmlID, localID)
    }

    areEditable = ( resourceEntries ) => {
        for( const resourceEntry of resourceEntries ) {
            if( !this.isEditable(resourceEntry) ) return false
        }
        return true
    }

    isEditable = ( resourceEntry ) => {
        // can always edit in a local project
        if( !this.remote ) return true
        return isEntryEditable(resourceEntry, this.userID )
    }

    isLoggedIn = () => {
        if( !this.remote ) return false
        return isLoggedIn( this.userID, this.serverURL )
    }

    getOrphanedResources = (resources) => {
        // v1.2.1 migration: check for orphaned resources
        return Object.values(resources).filter((r) => r.type !== 'teidoc' && !r.parentResource)    
    }

    startMigratingResource = (resourceID) => {
        fairCopy.ipcSend('startMigratingResource', resourceID)
    }

    migrateOrphanedResources = () => {
        // v1.2.1 migration: move orphaned resources into new TEI document
        this.orphanedResources.forEach((resourceEntry) => {
            // queue each for migration, enabling loading spinner
            this.startMigratingResource(resourceEntry.id)
        })
        const docName = this.projectName
        const existingIDs = Object.keys(this.idMap.idMap)
        const localID = getUniqueResourceID('teidoc', existingIDs, docName)
        const teidoc = this.newResource(docName, localID, 'teidoc', null)
        this.orphanedResources.forEach((resourceEntry) => {
            // move each into tei doc, ultimately disabling loading spinner
            resourceEntry.parentResource = teidoc.id
            this.updateResource(resourceEntry)
        })
        this.orphanedResources = []
    }

    copyPublishedLinkToClipboard = (teiDocument) => {
        // example: http://localhost:3789/public/2/tei_documents/fa25_adriaenssens_j/iiif"
        const publishedURL = `${this.serverURL}/public/${this.projectID}/tei_documents/${teiDocument.localID}/iiif`
        fairCopy.copyToClipBoard(publishedURL)
    }

    duplicateDocuments = (localResources) => {
        // duplicate resources and their children with new XML IDs and uuids
        const teiDocs = localResources.filter((r) => r.type === 'teidoc')
        teiDocs.forEach((parent) => {
            // duplicate parent tei doc, with new guid and local id
            const { id, localID, name } = parent
            const existingIDs = Object.keys(this.idMap.idMap)
            let newLocalID = getUniqueResourceID('teidoc', existingIDs, name)
            const parentEntry = {
                id: uuidv4(),
                localID: newLocalID,
                name, 
                type: 'teidoc',
                parentResource: null,
                ...cloudInitialConfig
            }
            this.addResource(parentEntry, "", getBlankResourceMap(parentEntry.id, parentEntry.type))

            // duplicate all of its children, assign to new parent
            const children = localResources.filter((r) => r.parentResource === id)
            const childLocalIDs = Object.keys(this.idMap.idMap[localID].ids)
            children.forEach((child) => {
                const { type: childType } = child
                const newChildLocalID = getUniqueResourceID(childType, childLocalIDs, child.localID)
                const childEntry = {
                    id: uuidv4(),
                    localID: newChildLocalID,
                    name: child.name,
                    type: childType,
                    parentResource: parentEntry.id,
                    ...cloudInitialConfig
                }
                this.addResource(childEntry, child.content, getBlankResourceMap(childEntry.id, childEntry.type))
            })
        })
    }

    forceDeleteResources = (localResources) => {
        // fully delete local resources, even in a remote project 
        const resourceIDs = localResources.map((r) => r.id)
        fairCopy.ipcSend('removeResources', resourceIDs, true)
    }
}

export function isEntryEditable( resourceEntry, userID ) {        
    if( resourceEntry.local ) return true
    if( resourceEntry.deleted ) return false

    // can only edit files checked out by me
    const { lastAction } = resourceEntry
    const { action_type: actionType, user } = lastAction
    const { id: actor } = user
    return actionType === 'check_out' && actor === userID
}

export function isCheckedOutRemote( resourceEntry, userID ) {
    if( resourceEntry.local ) return true
    if( resourceEntry.deleted ) return false

    // can only edit files checked out by me
    const { lastAction } = resourceEntry
    const { action_type: actionType, user } = lastAction
    const { id: actor } = user
    return actionType === 'check_out' && actor !== userID
}