const format = require('xml-formatter')
const fs = require('fs')
const log = require('electron-log')
const jsdom = require("jsdom")
const { JSDOM } = jsdom
const serialize = require("w3c-xmlserializer");

const exportResources =  async function exportResources(resourceIDs,path,projectStore) {
    for( const resourceID of resourceIDs ) {
        const resourceEntry = projectStore.manifestData.resources[resourceID]
        if( resourceEntry.type === 'teidoc') {
            await exportTEIDoc(resourceEntry,path,projectStore)
        } else {
            const resource = await projectStore.readUTF8File(resourceID)
            await exportXMLFile(path, resourceEntry.localID, resource)    
        }
    }
    log.info(`Export resources to: ${path}`)
}

async function exportTEIDoc(resourceEntry,path,projectStore) {
    let header, resources = []
    for( const resourceID of resourceEntry.resources ) {
        const resourceEntry = projectStore.manifestData.resources[resourceID]
        const resourceXML = await projectStore.readUTF8File(resourceID)
        const elName = resourceEntry.type === 'header' ? 'teiHeader' : resourceEntry.type === 'text' ? 'text' : 'facsimile'
        const resourceEl = getResourceEl( resourceXML, elName, resourceEntry.localID )
        if( resourceEntry.type === 'header' ) {
            header = resourceEl
        } else {
            resources.push(resourceEl)
        }
    }

    const resourceXML = `<?xml version="1.0" encoding="UTF-8"?><TEI xmlns="http://www.tei-c.org/ns/1.0"></TEI>`
    const resourceDOM = new JSDOM(resourceXML, { contentType: "text/xml" })
    const xmlDoc = resourceDOM.window.document
    const teiDoc = xmlDoc.getElementsByTagName('TEI')[0]
    teiDoc.appendChild(header)
    resources.map( resource => teiDoc.appendChild(resource))
    const teiDocXML = serialize(xmlDoc)
    exportXMLFile(path,resourceEntry.localID,teiDocXML)
}

function getResourceEl( resourceXML, elName, localID ) {
    const resourceDOM = new JSDOM(resourceXML, { contentType: "text/xml" })
    const xmlDoc = resourceDOM.window.document
    const el = xmlDoc.getElementsByTagName(elName)[0]
    el.setAttribute('xml:id',localID)
    return el
}

async function exportXMLFile(path, localID, content) {
    const filePath = `${path}/${localID}.xml`
    try {
        const xml = format(content, {
            indentation: '\t', 
            collapseContent: true, 
            lineSeparator: '\n'
        })
        fs.writeFileSync(filePath,xml)    
    } catch(e) {
        log.error(e)
        // if formatting fails, try to write the file without it
        fs.writeFileSync(filePath,content)    
    }
}

exports.exportResources = exportResources