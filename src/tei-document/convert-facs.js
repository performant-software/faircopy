import {facsTemplate} from "./tei-template"

export function iiifToFacsimile( manifestData ) {
    const { sequences } = manifestData
    const manifestID = manifestData['@id']
    const sequence = sequences[0]
    const { canvases } = sequence

    let n=1
    const surfaces = []
    for( const canvas of canvases ) {
        const id = generateID('page-',n++)
        const { images, width, height } = canvas
        const canvasURI = canvas['@id']
        const image = images[0]
        const { resource } = image
        const imageAPIURL = resource.service ? resource.service['@id'] : resource['@id']

        surfaces.push({
            id,
            width,
            height,
            imageAPIURL,
            canvasURI
        })
    }

    return {
        manifestID,
        surfaces
    }
}

export function teiToFacsimile(xml) {
    const parser = new DOMParser();

    const xmlDom = parser.parseFromString(xml, "text/xml")
    const facsEl = xmlDom.getElementsByTagName('facsimile')[0]
    const manifestID = facsEl.getAttribute('sameAs')
     
    const surfaces = []
    const surfaceEls = facsEl.getElementsByTagName('surface')
    for( let i=0; i < surfaceEls.length; i++ ) {
        const surfaceEl = surfaceEls[i]
        const id = surfaceEl.getAttribute('xml:id')
        const width = surfaceEl.getAttribute('lrx')
        const height = surfaceEl.getAttribute('lry')
        const canvasURI = surfaceEl.getAttribute('sameAs')
        const graphicEl = surfaceEl.getElementsByTagName('graphic')[0]
        const imageAPIURL = graphicEl.getAttribute('url')
        surfaces.push({
            id,
            canvasURI,
            width,
            height,
            imageAPIURL
        })
    }

    return {
        manifestID,
        surfaces
    }
}

export function facsimileToTEI(facs) {
   return facsTemplate(facs)
}

function generateID( prefix, ordinalID ) {
    let zeros = ""

    if( ordinalID < 10 ) {
        zeros = zeros + "0"
    }

    if( ordinalID < 100 ) {
        zeros = zeros + "0"
    }

    return `${prefix}${zeros}${ordinalID}`
}