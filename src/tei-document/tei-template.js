import { getExtensionForMIMEType } from './convert-facs'

export const teiDocTemplate = (headerID) => {
    return JSON.stringify({
        resources: [headerID]
    })
}

export const teiHeaderTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
    <teiHeader>
        <fileDesc>
            <titleStmt>
                <title>test</title>
            </titleStmt>
            <publicationStmt>
                <p>Information concerning the publication of this document.</p>
            </publicationStmt>
            <sourceDesc>
                <p>Description of the source(s) from which the document was derived.</p>
            </sourceDesc>
        </fileDesc>
    </teiHeader>
</TEI>
`

export const teiTextTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">    
<text>
    <body><p></p></body>
</text>
</TEI>
`

export const facsTemplate = (facsData) => { 
    const { manifestID, surfaces } = facsData

    const surfaceEls = []
    for( const surface of surfaces ) {
        const { id, type, width, height, imageAPIURL, canvasURI, localLabels, mimeType, resourceEntryID, zones  } = surface
        const labelEls = renderLocalLabels(localLabels)
        const zoneEls = zones ? renderZones(zones) : ""
        
        if( type === 'iiif' ) {
            surfaceEls.push(
                `<surface xml:id="${id}" ulx="0" uly="0" lrx="${width}" lry="${height}" sameAs="${canvasURI}" >${labelEls}<graphic mimeType="application/json" url="${imageAPIURL}"/>${zoneEls}</surface>`
            )    
        } else {
            const ext = getExtensionForMIMEType(mimeType)
            const filename = `${id}.${ext}`
            surfaceEls.push(
                `<surface xml:id="${id}" ulx="0" uly="0" lrx="${width}" lry="${height}">${labelEls}<graphic sameAs="${resourceEntryID}" mimeType="${mimeType}" url="${filename}"/>${zoneEls}</surface>`
            )    
        }
    }

    const sameAs = (manifestID) ? `sameAs="${manifestID}"` : ''

    return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
    <facsimile ${sameAs}>
        ${surfaceEls.join('')}
    </facsimile>
</TEI>
`
}

function renderLocalLabels(localLabels) {
    const langKeys = Object.keys(localLabels)

    const labelEls = []
    for( const langKey of langKeys ) {
        const labels = localLabels[langKey]
        for( const label of labels ) {
            if( langKey === 'none' ) {
                labelEls.push(`<label>${label}</label>`)
            } else {
                labelEls.push(`<label xml:lang="${langKey}">${label}</label>`)
            }
        }
    }

    return labelEls.join('')
}

function renderZones(zones) {
    const zoneEls = []
    for( const zone of zones ) {
        const { id,ulx,uly,lrx,lry,note} = zone
        const noteEl = note && note.length > 0 ? `<note>${note}</note>` : ""
        const coordAttrs = zone.points ? `points="${zone.points}"` : `ulx="${ulx}" uly="${uly}" lrx="${lrx}" lry="${lry}"`
        const zoneEl = `<zone xml:id="${id}" ${coordAttrs}>${noteEl}</zone>`
        zoneEls.push(zoneEl)
    }
    return zoneEls.join('\n')
}