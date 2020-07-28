
export const teiTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
    <teiHeader>
        <fileDesc>
            <titleStmt>
                <title></title>
            </titleStmt>
            <publicationStmt>
                <publisher/>
                <pubPlace/>
                <date/>
                <authority/>
            <availability>
                <p/> 
                </availability>
        </publicationStmt>
            <sourceDesc>
            <p/>
            </sourceDesc>
        </fileDesc>
    </teiHeader>
<text>
    <body></body>
</text>
</TEI>
`

export const facsTemplate = (facsData) => { 
    const { manifestID, surfaces } = facsData

    const surfaceEls = []
    for( const surface of surfaces ) {
        const { id, width, height, imageAPIURL, canvasURI, localLabels } = surface
        const labelEls = renderLocalLabels(localLabels)

        surfaceEls.push(
            `<surface xml:id="${id}" ulx="0" uly="0" lrx="${width}" lry="${height}" sameAs="${canvasURI}" >${labelEls}<graphic url="${imageAPIURL}"/></surface>`
        )
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
    <teiHeader>
        <fileDesc>
            <titleStmt>
                <title></title>
            </titleStmt>
            <publicationStmt>
                <publisher/>
                <pubPlace/>
                <date/>
                <authority/>
            <availability>
                <p/> 
                </availability>
        </publicationStmt>
            <sourceDesc>
            <p/>
            </sourceDesc>
        </fileDesc>
    </teiHeader>
    <facsimile sameAs="${manifestID}">
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