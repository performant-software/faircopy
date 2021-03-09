const format = require('xml-formatter')
const fs = require('fs')
const log = require('electron-log')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

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
        const resourceEl = getResourceEl( resourceXML, elName )
        if( resourceEntry.type === 'header' ) {
            header = resourceEl
        } else {
            resources.push(resourceEl)
        }
    }

    const teiDoc = `
    <?xml version="1.0" encoding="UTF-8"?>
    <TEI xmlns="http://www.tei-c.org/ns/1.0">
        ${header}
        ${resources.join('\n')}
    </TEI>
    `

    exportXMLFile(path,resourceEntry.localID,teiDoc)
}

function getResourceEl( resourceXML, elName ) {
    const resourceDOM = new JSDOM(resourceXML, { contentType: "text/xml" })
    const xmlDoc = resourceDOM.window.document
    const el = xmlDoc.getElementsByTagName(elName)[0]
    return el.outerHTML
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