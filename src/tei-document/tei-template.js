
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
        const { id, width, height, imageAPIURL, canvasURI } = surface
        surfaceEls.push(
            `<surface xml:id="${id}" ulx="0" uly="0" lrx="${width}" lry="${height}" sameAs="${canvasURI}" ><graphic url="${imageAPIURL}"/></surface>`
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
