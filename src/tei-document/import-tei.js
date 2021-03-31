import {sanitizeID} from "./attribute-validators"
import { v4 as uuidv4 } from 'uuid'

import TEIDocument from "./TEIDocument"
import {learnDoc} from "./faircopy-config"
import {parseText} from "./xml"

const fairCopy = window.fairCopy

// The are a wide number of valid configurations for TEI elements in the guidelines, but 
// to keep things simple, we are going to just support the simplest and most common document 
// structure, which is a single tei element containing one header and one or more texts and/or facs.
// We will also support import of TEI partials in the same format that we export them. (i.e. a single text or facs in a TEI element)

export function importResource(importData,parentResourceID,fairCopyProject) {
    const { path, data } = importData

    // locate the XML els that contain resources
    const extractedResources = extractResourceEls(data)

    const { idMap } = fairCopyProject
    let {fairCopyConfig} = fairCopyProject
    const resources = []

    const addResource = (resourceEl, name, localID, parentID) => {
        // TODO determine if it is a facs or text
        const { fairCopyConfig: nextFairCopyConfig, resourceEntry, content, resourceMap } = importTEIDocument(resourceEl,name,localID,parentID,fairCopyProject,fairCopyConfig)
        fairCopyConfig = nextFairCopyConfig
        resources.push({resourceEntry, content, resourceMap})
    }

    const name = fairCopy.services.getBasename(path,'.xml').trim()
    const sanitizedID = sanitizeID(name)
    const localID = sanitizedID && !idMap.get(sanitizedID) ? sanitizedID : idMap.getUniqueID(sanitizedID)  

    if( extractedResources.header ) {
        // create the tei doc 
        const teiDoc = createTEIDoc(name,localID,parentResourceID,idMap)
        const teiDocID = teiDoc.resourceEntry.id
        resources.push(teiDoc)

        // create the header
        addResource(extractedResources.header, "TEI Header", "header", teiDocID)

        // create the resources
        for( const resourceEl of extractedResources.resources ) {
            const name = resourceEl.getAttribute('xml:id')
            const sanitizedID = name ? sanitizeID(name) : idMap.getUniqueID('text') 
            const localID = sanitizedID && !idMap.get(sanitizedID) ? sanitizedID : idMap.getUniqueID(sanitizedID)  
            addResource(resourceEl, name, localID, teiDocID)
        }
    } else {
        // if there is no header, there will be only one resource, it gets the name and localID
        addResource(extractedResources[0], name, localID, parentResourceID)
    }
    
    // Things look OK, return these resources
    return { resources, fairCopyConfig }
}

function extractResourceEls(data) {

    // parse the data into a ProseMirror doc
    const parser = new DOMParser();
    const xmlDom = parser.parseFromString(data, "text/xml");

    // Check for basic validity 
    if( xmlDom.getElementsByTagName('parsererror').length > 0 ) {
        throw new Error('Document is not a well formed XML document.')
    } 

    const teiEl = xmlDom.getElementsByTagName('tei')[0] || xmlDom.getElementsByTagName('TEI')[0]
    if( !teiEl ) {
        throw new Error('Document must contain a <TEI> element.')
    }
    const teiHeaderEl = teiEl.getElementsByTagName('teiheader')[0] || teiEl.getElementsByTagName('teiHeader')[0]

    // TODO handle import of facs 
    let textEls = teiEl.getElementsByTagName('text') 
    if( textEls.length === 0 ) textEls = teiEl.getElementsByTagName('TEXT')

    if( !teiHeaderEl || textEls.length === 0 ) {
        throw new Error('<TEI> element must contain <teiHeader> and <text>.')
    } 

    const resources = []
    for( let i=0; i < textEls.length; i++ ) {
        resources.push(textEls[i])
    }

    // TODO return the header, facs, and texts found
    return { header: teiHeaderEl, resources }
}

function createTEIDoc(name,localID,parentResourceID,idMap) {
    const resourceEntry = {
        id: uuidv4(),
        localID,
        name,
        type: 'teidoc',
        parentResource: parentResourceID
    }
    const resourceMap = idMap.getBlankResourceMap(true)
    return {resourceEntry, content: "", resourceMap}
}

function importTEIDocument(textEl, name, localID, parentResourceID, fairCopyProject, fairCopyConfig) {
    const { idMap, teiSchema } = fairCopyProject

    const resourceEntry = {
        id: uuidv4(),
        localID,
        name,
        type: 'text',
        parentResource: parentResourceID
    }

    // map existing IDs
    const tempDoc = new TEIDocument(null,'text',fairCopyProject)
    const doc = parseText(textEl,tempDoc,teiSchema)
    const resourceMap = idMap.mapResource( 'text', doc )

    // the XML of this text el
    const content = textEl.outerHTML

    // learn the attributes and vocabs
    const nextFairCopyConfig = learnDoc(fairCopyConfig, doc, teiSchema, tempDoc)

    return { resourceEntry, content, resourceMap, fairCopyConfig: nextFairCopyConfig }
}

// TODO
// function importFacsDocument(facsEl, fairCopyProject) {
//     return 
// }
