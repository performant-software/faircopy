const format = require('xml-formatter')
const fs = require('fs')
const log = require('electron-log')
const jsdom = require("jsdom")
const { JSDOM } = jsdom
const serialize = require("w3c-xmlserializer");

const exportResource =  async function exportResource(resourceData, path) {
    const { resourceEntry, contents } = resourceData
    if( resourceEntry.type === 'teidoc') {
        const { childEntries } = resourceData
        exportTEIDoc(resourceEntry,childEntries,contents,path)
    } else {
        const content = contents[resourceEntry.id]
        exportXMLFile(path, resourceEntry.localID, content)    
    }
    log.info(`Export resources to: ${path}`)
}

async function exportTEIDoc(resourceEntry,childEntries,contents,path) {
    let header, resources = []
    for( const childEntry of childEntries ) {
        const resourceXML = contents[childEntry.id]
        const elName = childEntry.type === 'header' ? 'teiHeader' : childEntry.type === 'text' ? 'text' : childEntry.type === 'standOff' ? 'standOff' : childEntry.type === 'sourceDoc' ? 'sourceDoc' : 'facsimile'
        const resourceEl = getResourceEl( resourceXML, elName, childEntry.localID )
        if( childEntry.type === 'header' ) {
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

function exportXMLFile(path, localID, content) {
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

exports.exportResource = exportResource