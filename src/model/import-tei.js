
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios';

import TEIDocument from "./TEIDocument"
import {learnDoc} from "./faircopy-config"
import {parseText, serializeText} from "./xml"
import {teiTextTemplate} from './tei-template'
import { cloudInitialConfig } from './FairCopyProject'
import {teiToFacsimile} from './convert-facs'
import { getBlankResourceMap, mapResource, getUniqueResourceID } from "./id-map"
import { facsimileToTEI } from './convert-facs'

const fairCopy = window.fairCopy

export function importResource(importData,parentEntry,fairCopyProject) {
    if( importData.path ) {
        return importFileResource(importData,parentEntry,fairCopyProject)
    } else {
        return importIIIFResource(importData,parentEntry,fairCopyProject)
    }
}

function importFileResource(importData,parentEntry,fairCopyProject) {
    const { path, data, options } = importData
    const { idMap } = fairCopyProject

    // what do we call this resource?
    let name, xmlExt = false
    if( path.toLowerCase().endsWith('.xml') ) {
        name = fairCopy.services.getBasename(path,'.xml').trim()
        xmlExt = true
    } else if( path.toLowerCase().endsWith('.txt') ){
        // trim off .txt if it is found 
        name = fairCopy.services.getBasename(path,'.txt').trim()
    } else {
        name = fairCopy.services.getBasename(path).trim()
    }
    const siblingIDs = parentEntry ? Object.keys(idMap.idMap[parentEntry.localID].ids) : Object.keys(idMap.idMap)
    const localID = getUniqueResourceID('resource', siblingIDs, name )
    const existingParentID = parentEntry ? parentEntry.id : null

    // if this is an XML file, parse the dom
    const xmlDom = parseDOM(data)

    if( xmlDom ) {
        return importXMLResource(xmlDom, name, localID, idMap, parentEntry, existingParentID, fairCopyProject, options)
    } else if( xmlExt ) {
        // if the file had a .xml extension but is invalid XML
        throw new Error('File contains invalid XML.')
    } else {
        return importTxtResource(data, name, localID, existingParentID, fairCopyProject, options)
    }
}

function importIIIFResource( importData, parentEntry, fairCopyProject) {
    const { facs, importFacs, sequenceTexts, canvasTexts } = importData 
    const { idMap, fairCopyConfig } = fairCopyProject
    const resources = []

    if( importFacs ) {
        const { id: requestedID, name } = facs
        const siblingIDs = parentEntry ? Object.keys(this.idMap.idMap[parentEntry.localID].ids) : Object.keys(idMap.idMap)
        const uniqueID = getUniqueResourceID('facs', siblingIDs, requestedID )
        const existingParentID = parentEntry ? parentEntry.id : null
    
        const resourceEntry = {
            id: uuidv4(),
            name,
            localID: uniqueID,
            type: 'facs',
            parentResource: existingParentID,
            ...cloudInitialConfig
        }    

        const resourceMap = mapResource( resourceEntry, facs )
        const content = facsimileToTEI(facs)   
        resources.push({ resourceEntry, content, resourceMap })
    }

    // for now, use these options for text import
    const options = { lineBreakParsing: true, learnStructure: false }

    // find the text with the matching URI and import it
    for( const sequenceText of sequenceTexts ) {
        const textRef = facs.texts.find( text => text.manifestID === sequenceText )
        // importRemoteText(textRef, parentEntry, fairCopyProject, options)
    }

    // for( const canvasText of canvasTexts ) {
    //     const options = { facs, lineBreakParsing: true, learnStructure: false }
    //     importRemoteText(canvasText, parentEntry, fairCopyProject, options)
    // }
    
    return { resources, fairCopyConfig }
}

function importRemoteText( textRef, parentEntry, fairCopyProject, options) {
    const { manifestID, format, name } = textRef
    const { idMap } = fairCopyProject

    axios.get(manifestID).then(
        (resp) => {
            try {
                const { data } = resp
                const existingParentID = parentEntry ? parentEntry.id : null
                const siblingIDs = parentEntry ? Object.keys(idMap.idMap[parentEntry.localID].ids) : Object.keys(idMap.idMap)
                const localID = getUniqueResourceID('resource', siblingIDs, name )
            
                let resource
                if( format === 'tei' ) {
                    const xmlDom = parseDOM(data)
                    resource = importXMLResource(xmlDom, name, localID, idMap, parentEntry, existingParentID, fairCopyProject, options)
                } else {
                    resource = importTxtResource(data, name, localID, existingParentID, fairCopyProject, options)
                }
                // TODO where to send resource?
            } catch(error) {
                // TODO where to send errors
            }   
        },
        (error) => {
            // TODO
        }
    )
}
    
// There are a wide number of valid configurations for TEI elements in the guidelines, but 
// to keep things simple, we are going to support the most common document 
// structure: a single tei element containing one header and one or more texts and/or facs.
// We will also support import of TEI partials in the same format that we export them. (i.e. a single 
// text or facs in a TEI element)

function importXMLResource(xmlDom, name, localID, idMap, parentEntry, existingParentID, fairCopyProject, options) {
    const { learnStructure } = options

    // locate the XML els that contain resources
    const extractedResources = extractResourceEls(xmlDom)

    let {fairCopyConfig} = fairCopyProject
    const resources = []

    if( extractedResources.header ) {
        let parentEntryID, childLocalIDs, parentName

        // if there isn't a parent, create a tei doc, otherwise add resources to current parent
        if( !parentEntry ) {
            // create the tei doc 
            const teiDoc = createTEIDoc(name,localID,idMap)
            const teiDocID = teiDoc.resourceEntry.id
            resources.push(teiDoc)

            // add resources to teidoc
            parentEntryID = teiDocID
            childLocalIDs = []
            parentName = name

            // create the header
            const resource = createResource(extractedResources.header, "TEI Header", "header", parentEntryID, fairCopyProject, fairCopyConfig, learnStructure)      
            resources.push(resource)
        } else {
            // add resources to existing parent
            parentName = parentEntry.name
            parentEntryID = parentEntry.id
            childLocalIDs = Object.keys(idMap.idMap[parentEntry.localID].ids)
        }

        // create the resources
        const typeCounters = {}
        for( const resourceEl of extractedResources.resources ) {
            const xmlID = resourceEl.getAttribute('xml:id')
            const childType = determineResourceType(resourceEl)
            const childLocalID = getUniqueResourceID(childType, childLocalIDs, xmlID, typeCounters)
            childLocalIDs.push(childLocalID)
            const childName = `${parentName} - ${childLocalID}`
            const resource = createResource(resourceEl, childName, childLocalID, parentEntryID, fairCopyProject, fairCopyConfig, learnStructure)
            resources.push(resource)
        }
    } else {
        // if there is no header only take the first resource, it gets the name and localID
        const resource = createResource(extractedResources.resources[0], name, localID, existingParentID, fairCopyProject, fairCopyConfig, learnStructure)
        resources.push(resource)
    }
    
    // Things look OK, return these resources
    return { resources, fairCopyConfig }
}

function importTxtResource(data, name, localID, parentID, fairCopyProject, options) {
    const {fairCopyConfig} = fairCopyProject
    const { lineBreakParsing, learnStructure } = options

    const xmlDom = parseDOM(teiTextTemplate)
    const bodyEl = xmlDom.getElementsByTagName('body')[0]

    // lineBreakParsing all or multi
    const splitMethod = lineBreakParsing === 'multi' ? /\r*\n\r*\n/ : '\n'
    const lines = data.split(splitMethod)
    
    if( lines.length > 0 ) {
        // remove blank p if there is content
        const pEl = xmlDom.getElementsByTagName('p')[0]
        pEl.parentNode.removeChild(pEl)
    }

    for( const line of lines ) {
        const p = xmlDom.createElement('p')
        p.appendChild(document.createTextNode(line));
        bodyEl.appendChild(p)
    }

    const teiEl = xmlDom.getElementsByTagName('TEI')[0]
    const resourceEl = teiEl.getElementsByTagName('text')[0]

    const resource = createResource(resourceEl, name, localID, parentID, fairCopyProject, fairCopyConfig, learnStructure)
    return { resources: [ resource ], fairCopyConfig }
}

function parseDOM(data) {
    const parser = new DOMParser();
    const xmlDom = parser.parseFromString(data, "text/xml");

    // detect malformedness errors, return null in that case
    if( xmlDom.getElementsByTagName('parsererror').length > 0 ) {
        return null 
    } 
    return xmlDom
}

function extractResourceEls(xmlDom) {
    const teiEl = xmlDom.getElementsByTagName('tei')[0] || xmlDom.getElementsByTagName('TEI')[0]
    if( !teiEl ) {
        throw new Error('Document must contain a <TEI> element.')
    }
    const teiHeaderEl = teiEl.getElementsByTagName('teiheader')[0] || teiEl.getElementsByTagName('teiHeader')[0]

    let textEls = teiEl.getElementsByTagName('text') 
    if( textEls.length === 0 ) textEls = teiEl.getElementsByTagName('TEXT')

    let standOffEls = teiEl.getElementsByTagName('standOff') 
    if( standOffEls.length === 0 ) standOffEls = teiEl.getElementsByTagName('STANDOFF')

    let sourceDocEls = teiEl.getElementsByTagName('sourceDoc') 
    if( sourceDocEls.length === 0 ) sourceDocEls = teiEl.getElementsByTagName('SOURCEDOC')

    let facsEls = teiEl.getElementsByTagName('facsimile') 
    if( facsEls.length === 0 ) facsEls = teiEl.getElementsByTagName('FACSIMILE')

    if( textEls.length === 0 && facsEls.length === 0 && standOffEls.length === 0 && sourceDocEls.length === 0 ) {
        throw new Error('<TEI> element must contain one more more <text>, <standOff>, <sourceDoc>, or <facsimile> elements.')
    } 

    const resources = []
    for( let i=0; i < textEls.length; i++ ) {
        resources.push(textEls[i])
    }
    for( let i=0; i < standOffEls.length; i++ ) {
        resources.push(standOffEls[i])
    }
    for( let i=0; i < sourceDocEls.length; i++ ) {
        resources.push(sourceDocEls[i])
    }
    for( let i=0; i < facsEls.length; i++ ) {
        resources.push(facsEls[i])
    }

    return { header: teiHeaderEl, resources }
}

function createTEIDoc(name,localID,idMap) {
    const resourceEntry = {
        id: uuidv4(),
        localID,
        name,
        type: 'teidoc',
        parentResource: null,
        ...cloudInitialConfig
    }
    const resourceMap = getBlankResourceMap(resourceEntry.id, resourceEntry.type)
    return {resourceEntry, content: "", resourceMap}
}

function createResource(resourceEl, name, localID, parentID, fairCopyProject, fairCopyConfig, learnStructure ) {
    const type = determineResourceType(resourceEl)
    if( type === 'facs' ) {
        const facsResource = createFacs(resourceEl,name,localID,parentID)
        return facsResource  
    } else {
        const { fairCopyConfig: nextFairCopyConfig, resourceEntry, content, resourceMap } = createText(resourceEl,name,type,localID,parentID,fairCopyProject,fairCopyConfig, learnStructure)
        fairCopyConfig = nextFairCopyConfig
        return {resourceEntry, content, resourceMap}
    }
}

function determineResourceType(resourceEl) {
    const resourceName = resourceEl.tagName.toLowerCase()
    return ( resourceName === 'text' ) ? 'text' :  ( resourceName === 'teiheader' ) ? 'header' : (resourceName === 'standoff' ) ? 'standOff' : (resourceName === 'sourcedoc') ? 'sourceDoc' : 'facs'
}

function createText(textEl, name, type, localID, parentResourceID, fairCopyProject, fairCopyConfig, learnStructure) {
    const { teiSchema } = fairCopyProject

    const resourceEntry = {
        id: uuidv4(),
        localID,
        name,
        type,
        parentResource: parentResourceID,
        ...cloudInitialConfig
    }

    // map existing IDs
    const tempDoc = new TEIDocument(resourceEntry,null,fairCopyProject)
    const doc = parseText(textEl,tempDoc,teiSchema,type)
    const resourceMap = mapResource( resourceEntry, doc )

    // extract normalize content
    const content = serializeText(doc, tempDoc, teiSchema)

    // learn the attributes and vocabs
    const nextFairCopyConfig = learnStructure ? learnDoc(fairCopyConfig, doc, teiSchema, tempDoc) : fairCopyConfig

    return { resourceEntry, content, resourceMap, fairCopyConfig: nextFairCopyConfig }
}

function createFacs(facsEl, name, localID, parentResourceID) {
    const resourceEntry = {
        id: uuidv4(),
        localID,
        name,
        type: 'facs',
        parentResource: parentResourceID,
        ...cloudInitialConfig
    }

    // the XML of this facs el
    const content = `<?xml version="1.0" encoding="UTF-8"?><TEI xmlns="http://www.tei-c.org/ns/1.0">${facsEl.outerHTML}</TEI>`

    // generate resource map
    const facs = teiToFacsimile(content)        
    const resourceMap = mapResource( resourceEntry, facs )

    return { resourceEntry, content, resourceMap }
}