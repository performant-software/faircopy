import xmlFormat from 'xml-formatter'
import serialize from "w3c-xmlserializer"

export function serializeResource(resourceData,formatXML=true) {
    const { resourceEntry, contents } = resourceData
    if( resourceEntry.type === 'teidoc') {
        const { childEntries } = resourceData
        const teiDocXML = serializeTEIDoc(childEntries,contents)
        return formatXML ? formatXMLFile(teiDocXML) : teiDocXML
    } else {
        const content = contents[resourceEntry.id]
        return formatXML ? formatXMLFile(content) : content
    }
}

function serializeTEIDoc(childEntries,contents) {
    let header, resources = []
    for( const childEntry of childEntries ) {
        const resourceXML = contents[childEntry.id]
        const elName = childEntry.type === 'header' ? 'teiHeader' : childEntry.type === 'text' ? 'text' : childEntry.type === 'standOff' ? 'standOff' : childEntry.type === 'sourceDoc' ? 'sourceDoc' : 'facsimile'
        const resourceEl = getResourceEl( resourceXML, elName, childEntry.localID )
        if( childEntry.type === 'header' ) {
            header = resourceEl
        } else {
            resources.push({ localID: childEntry.localID, el: resourceEl})
        }
    }

    const resourceXML = `<?xml version="1.0" encoding="UTF-8"?><TEI xmlns="http://www.tei-c.org/ns/1.0"></TEI>`
    const xmlDoc = new DOMParser().parseFromString(resourceXML,"text/xml")
    const teiDoc = xmlDoc.getElementsByTagName('TEI')[0]
    teiDoc.appendChild(header)
    // sort resources by localID
    resources.sort( (a,b) => { 
        const nameA = a.localID.toUpperCase()
        const nameB = b.localID.toUpperCase()
        if (nameA < nameB) {
            return -1
        }
        if (nameA > nameB) {
            return 1
        }
        return 0
    })
    resources.map( resource => teiDoc.appendChild(resource.el))
    const teiDocXML = serialize(xmlDoc)
    return teiDocXML
}

function getResourceEl( resourceXML, elName, localID ) {
    const xmlDoc = new DOMParser().parseFromString(resourceXML,"text/xml")
    const el = xmlDoc.getElementsByTagName(elName)[0]
    el.setAttribute('xml:id',localID)
    return el
}

function formatXMLFile(content) {
    try {
        const xml = xmlFormat(content, {
            indentation: '\t', 
            collapseContent: true, 
            lineSeparator: '\n'
        })
        return xml
    } catch(e) {
        // if formatting fails, try to write the file without it
        return content  
    }
}
