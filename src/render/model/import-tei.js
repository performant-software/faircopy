
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios';
import {getPathBasename} from './parse-path'

import TEIDocument from "./TEIDocument"
import {learnDoc} from "./faircopy-config"
import {parseText, serializeText} from "./xml"
import {teiTextTemplate, teiSourceDocTemplate, teiHeaderTemplate} from './tei-template'
import { cloudInitialConfig } from './FairCopyProject'
import {teiToFacsimile} from './convert-facs'
import { getBlankResourceMap, mapResource, getUniqueResourceID } from "./id-map"
import { facsimileToTEI } from './convert-facs'

export async function importResource(importData,parentEntry,fairCopyProject) {
    if( importData.path ) {
        return importFileResource(importData,parentEntry,fairCopyProject)
    } else {
        return await importIIIFResource(importData,parentEntry,fairCopyProject)
    }
}

function importFileResource(importData,parentEntry,fairCopyProject) {
    const { path, data, options } = importData
    const { replaceResource } = options
    const { idMap } = fairCopyProject

    // what do we call this resource?
    const name = getPathBasename(path)
    let xmlExt = path.toLowerCase().endsWith('.xml')

    let localID
    if( replaceResource ) {
        localID = getUniqueResourceID('resource', [], name )
    } else {
        const siblingIDs = parentEntry ? Object.keys(idMap.idMap[parentEntry.localID].ids) : Object.keys(idMap.idMap)
        localID = getUniqueResourceID('resource', siblingIDs, name )
    }
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

async function importIIIFResource( importData, parentEntry, fairCopyProject) {
    const { facs, importFacs, sequenceTexts, canvasTexts } = importData 
    const { idMap } = fairCopyProject
    const resources = []

    // import can create multiple resources at once with local ids based
    // on external resources. keep track of sibling IDs to prevent collisions
    let siblingIDs = parentEntry ? Object.keys(idMap.idMap[parentEntry.localID].ids) : []
    let uncleIDs = Object.keys(idMap.idMap)
    let actualParentEntry = parentEntry

    if( importFacs ) {
        const { name } = facs
        // if the facs is being added to an existing TEI doc, it will get requested ID, otherwise the generated TEI Doc will get it
        const facsLocalID = actualParentEntry ? getUniqueResourceID('facs', siblingIDs, name ) : getUniqueResourceID('facs', siblingIDs)
        
        // create a TEI doc if there isn't one
        if( !actualParentEntry ) {
            // create the tei doc 
            const uniqueID = getUniqueResourceID('resource', uncleIDs, name )
            const teiDoc = createTEIDoc(name,uniqueID)
            actualParentEntry = teiDoc.resourceEntry
            resources.push(teiDoc)
            uncleIDs.push(uniqueID)

            const headerResource = createHeader(name,actualParentEntry.id)
            resources.push(headerResource)
            siblingIDs.push(headerResource.localID)
        } 
    
        const resourceEntry = {
            id: uuidv4(),
            name,
            localID: facsLocalID,
            type: 'facs',
            parentResource: actualParentEntry.id,
            ...cloudInitialConfig
        }    

        const resourceMap = mapResource( resourceEntry, facs )
        const content = facsimileToTEI(facs)   
        resources.push({ resourceEntry, content, resourceMap })
        siblingIDs.push(resourceEntry.localID)
    }

    // for now, use these options for text import
    const seqOptions = { resourceType: 'text', lineBreakParsing: 'multi', learnStructure: false }

    // find the text with the matching URI and import it
    for( const sequenceText of sequenceTexts ) {
        const textRef = facs.texts.find( text => text.manifestID === sequenceText )
        let importedTexts
        if( textRef.format === 'tei' ) {
            importedTexts = await importRemoteXML( facs.name, textRef, uncleIDs, fairCopyProject, seqOptions)
        } else {
            const ids = parentEntry ? siblingIDs : uncleIDs
            importedTexts = await importRemoteText( facs.name, textRef, parentEntry, ids, fairCopyProject, seqOptions)
        }
        resources.push(...importedTexts)
    }

    // import all the texts of a given type as a single text resource
    for( const canvasText of canvasTexts ) {
        const importedTexts = await importCanvasText(facs, canvasText, actualParentEntry, siblingIDs, fairCopyProject)       
        resources.push(...importedTexts)
    }
    
    return resources
}

async function importRemoteXML( name, textRef, uncleIDs, fairCopyProject, options) {
    const { manifestID } = textRef
    const { idMap } = fairCopyProject
    
    const resp = await axios.get(manifestID)
    const { data } = resp

    const xmlDom = parseDOM(data)
    const localID = getUniqueResourceID('resource', uncleIDs, name )
    uncleIDs.push(localID)

    return importXMLResource(xmlDom, name, localID, idMap, null, null, fairCopyProject, options)
}

async function importRemoteText( name, textRef, parentEntry, siblingIDs, fairCopyProject, options) {
    const { manifestID } = textRef
    
    const resp = await axios.get(manifestID)
    const { data } = resp
    const localID = getUniqueResourceID('resource', siblingIDs, name )
    siblingIDs.push(localID)
    const existingParentID = parentEntry ? parentEntry.id : null

    return importTxtResource(data, name, localID, existingParentID, fairCopyProject, options)
}

async function importCanvasText( facs, textTypeName, parentEntry, siblingIDs, fairCopyProject ) {    

    // assemble the list of pages associated with these surfaces
    const pages = []
    for( const surface of facs.surfaces ) {
        for( const textRef of surface.texts ) {
            const { manifestID, name } = textRef
            if( name === textTypeName ) {
                const { data: text } = await axios.get(manifestID)
                pages.push({
                    surfaceID: surface.id,
                    text
                })
            }
        }
    }

    const localID = getUniqueResourceID('resource', siblingIDs, textTypeName )
    siblingIDs.push(localID)
    const existingParentID = parentEntry ? parentEntry.id : null

    const options = { paginated: true }
    return importTxtResource(pages, textTypeName, localID, existingParentID, fairCopyProject, options)
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
            const teiDoc = createTEIDoc(name,localID)
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
    return resources
}

function importTxtResource(data, name, localID, parentID, fairCopyProject, options) {
    const {fairCopyConfig} = fairCopyProject
    const { lineBreakParsing, learnStructure, resourceType, paginated } = options

    let resourceEl
    if( paginated ) {
        resourceEl = importPaginatedTxtToSourceDocResource(data)
    } else if(resourceType === 'text') {
        resourceEl = importTxtToTextResource(data, lineBreakParsing)
    } else {
        resourceEl = importTxtToSourceDocResource(data)
    }

    const resource = createResource(resourceEl, name, localID, parentID, fairCopyProject, fairCopyConfig, learnStructure)
    return [ resource ]    
}

function importTxtToTextResource(data, lineBreakParsing) {
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
    return resourceEl
}

function importTxtToSourceDocResource(data) {
    const xmlDom = parseDOM(teiSourceDocTemplate)
    const surfaceEl = xmlDom.getElementsByTagName('surface')[0]
    const lines = data.split('\n')
    
    if( lines.length > 0 ) {
        // remove blank line if there is content
        const lineEl = xmlDom.getElementsByTagName('line')[0]
        lineEl.parentNode.removeChild(lineEl)
    }

    for( const line of lines ) {
        const lineEl = xmlDom.createElement('line')
        lineEl.appendChild(document.createTextNode(line));
        surfaceEl.appendChild(lineEl)
    }

    const teiEl = xmlDom.getElementsByTagName('TEI')[0]
    const resourceEl = teiEl.getElementsByTagName('sourceDoc')[0]
    return resourceEl
}

function importPaginatedTxtToSourceDocResource(pages) {
    const xmlDom = parseDOM(teiSourceDocTemplate)
    const teiEl = xmlDom.getElementsByTagName('TEI')[0]
    const resourceEl = teiEl.getElementsByTagName('sourceDoc')[0]

    for( let i=0; i < pages.length; i++ ) {
        const page = pages[i]        
        const { surfaceID, text } = page
    
        let surfaceEl
        if( i === 0 ) {
            surfaceEl = xmlDom.getElementsByTagName('surface')[0]
            const lineEl = xmlDom.getElementsByTagName('line')[0]
            lineEl.parentNode.removeChild(lineEl)            
        } else {
            surfaceEl = xmlDom.createElement('surface')
            resourceEl.appendChild(surfaceEl)
        }
        surfaceEl.setAttribute('facs',`#${surfaceID}`)

        const lines = text.split('\n')    
        for( const line of lines ) {
            if( line.length > 0 ) {
                const lineEl = xmlDom.createElement('line')
                lineEl.appendChild(document.createTextNode(line));
                surfaceEl.appendChild(lineEl)    
            }
        }
    }

    return resourceEl
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

function createTEIDoc(name,localID) {
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

function createHeader(name,parentID) {
    const resourceEntry = {
        id: uuidv4(),
        localID: 'header',
        name: 'TEI Header', 
        type: 'header',
        remote: false,
        parentResource: parentID,
        ...cloudInitialConfig
    }    
    const resourceMap = getBlankResourceMap(resourceEntry.id, resourceEntry.type)
    return { resourceEntry, content: teiHeaderTemplate(name), resourceMap }
}

function createResource(resourceEl, name, localID, parentID, fairCopyProject, fairCopyConfig, learnStructure ) {
    const type = determineResourceType(resourceEl)
    if( type === 'facs' ) {
        return createFacs(resourceEl,name,localID,parentID)
    } else {
        return createText(resourceEl,name,type,localID,parentID,fairCopyProject,fairCopyConfig, learnStructure)
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
    if( learnStructure ) learnDoc(fairCopyConfig, doc, teiSchema, tempDoc)

    return { resourceEntry, content, resourceMap }
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