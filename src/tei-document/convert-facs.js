import {facsTemplate} from "./tei-template"
import { getLocalString } from './iiif'

// Supports IIIF v2 and v3
export function iiifToFacsimile( manifestData ) {
    const context = manifestData["@context"]
    if( context.includes("http://iiif.io/api/presentation/3/context.json") ) {
        return iiifToFacsimile3( manifestData )
    }
    if( context.includes("http://iiif.io/api/presentation/2/context.json") ) {
        return iiifToFacsimile2( manifestData )
    }
    throw new Error("Expected IIIF Presentation API context 2 or 3.")
}

function iiifToFacsimile3( manifestData ) {
    if( manifestData.type !== "Manifest" ) throw new Error("Expected a manifest as the root object.")

    const canvases = manifestData.items
    const manifestID = val('id', manifestData)

    const surfaceIDs = []
    const surfaces = []
    let n=1
    for( const canvas of canvases ) {
        if( canvas.type !== "Canvas" ) throw new Error("Expected a Canvas item.")
        const canvasURI = canvas.id
        const annotationPage = canvas.items[0]
        if( !annotationPage || annotationPage.type !== "AnnotationPage" ) throw new Error("Expected an Annotation Page item.")
        const annotations = annotationPage.items
        for( const annotation of annotations ) {
            if( annotation.type !== "Annotation" ) throw new Error("Expected an Annotation item.")
            if( annotation.motivation === "painting" && annotation.body && annotation.body.type === "Image" ) {
                const {body} = annotation
                const {width,height} = body
                let imageAPIURL
                if( body.service ) {
                    for( const serving of body.service ) {
                        const servingType = val('type', serving)
                        if( servingType === "ImageService2") {
                            imageAPIURL = val('id', serving)
                            break
                        }
                    }
                } else {
                    imageAPIURL = val('id', body)
                }
                let localLabels = str( canvas.label )
                let id = generateOrdinalID('f',n)
                localLabels = !localLabels ? { 'none': [ id ] } : localLabels
                surfaceIDs.push(id)
                n++ // page count

                surfaces.push({
                    id,
                    type: 'iiif',
                    localLabels,
                    width,
                    height,
                    imageAPIURL,
                    zones: [],
                    canvasURI
                })  
                break // one surface per canvas      
            }
        } 
    }

    return {
        manifestID,
        surfaces
    }
}

function iiifToFacsimile2( manifestData ) {
    const { sequences } = manifestData
    const manifestID = val('id', manifestData)
    const sequence = sequences[0]
    const { canvases } = sequence

    const surfaceIDs = []
    const surfaces = []
    let n=1
    for( const canvas of canvases ) {
        const { images, width, height } = canvas
        const canvasURI = val('id', canvas)
        const image = images[0]
        const { resource } = image
        const imageAPIURL = resource.service ? val('id', resource.service) : val('id', resource)
        const localLabels = str( canvas.label )
        let id = generateOrdinalID('f',n)
        surfaceIDs.push(id)
        n++ // page count

        surfaces.push({
            id,
            type: 'iiif',
            localLabels,
            width,
            height,
            imageAPIURL,
            zones: [],
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
        const mimeType = graphicEl.getAttribute('mimeType')
        let imageAPIURL, resourceEntryID, type
        if( !mimeType || mimeType === 'application/json' ) {
            type = 'iiif'
            imageAPIURL = graphicEl.getAttribute('url')
        } else {
            type = 'local'
            resourceEntryID = graphicEl.getAttribute('sameAs')
        }
        const labelEls = surfaceEl.getElementsByTagName('label')
        const localLabels = getLocalLabels(labelEls)
        const zones = parseZones(surfaceEl)

        surfaces.push({
            id,
            type,
            canvasURI,
            resourceEntryID,
            localLabels,
            width,
            height,
            mimeType,
            imageAPIURL,
            zones
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

export function getExtensionForMIMEType( mimeType ) {
    switch(mimeType) {
        case 'image/png':
            return 'png'
        case 'image/jpeg':
            return 'jpg'
        case 'image/gif':
            return 'gif' 
        default:
            throw new Error(`Unknown MIMEType: ${mimeType}`)
    }        
}

export function getSurfaceNames( surface, lang='en') {
    const labels = getLocalString(surface.localLabels, lang)
    const title = labels[0]
    const subHeadings = labels.slice(1)
    return { title, subHeadings }
}

export function setSurfaceTitle( surface, title, lang='en' ) {
    const key = surface.localLabels[lang] ? lang : 'none'
    surface.localLabels[key][0] = title
} 

function getLocalLabels(labelEls) {
    const localLabels = {}
    for( let i=0; i < labelEls.length; i++ ) {
        const labelEl = labelEls[i]
        let langKey = labelEl.getAttribute('xml:lang')
        if( !langKey ) {
            langKey = 'none'
        }
        const label = labelEl.innerHTML
        if( !localLabels[langKey] ) {
            localLabels[langKey] = []
        }
        localLabels[langKey].push(label)
    }
    return localLabels
}

export function generateOrdinalID( prefix, ordinalID ) {
    let zeros = ""

    if( ordinalID < 10 ) {
        zeros = zeros + "0"
    }

    if( ordinalID < 100 ) {
        zeros = zeros + "0"
    }

    return `${prefix}${zeros}${ordinalID}`
}

function str(values) {
    // IIIF v2 doesn't have localized values, convert it to IIIF v3 format
    if( typeof values === 'string' ) {
        return { 'none': [ values ] }
    } else {
        return values
    }
}

const JSONLDKeywords = ['id', 'type', 'none']

// JSON-LD keywords in IIIF v3 do not have @ symbols
function val( key, obj ) {
    if( JSONLDKeywords.includes(key) ) {
        const atKey = `@${key}`
        if( obj[atKey] ) {
            return obj[atKey]
        } else if( obj[key] ) {
            return obj[key]
        } else {
            return undefined
        }    
    } else {
        return obj[key]
    }
}


function parseZones( surfaceEl ) {
    const zones = []
    const zoneEls = surfaceEl.getElementsByTagName('zone')
    if( zoneEls ) {
        for( let i=0; i < zoneEls.length; i++ ) {
            const zoneEl = zoneEls[i]
            const id = zoneEl.getAttribute('xml:id')
            const noteEls = surfaceEl.getElementsByTagName('note')
            const noteEl = (noteEls && noteEls.length > 0 ) ? noteEls[0] : null
            const note = noteEl ? noteEl.innerHTML : ""
            const points = zoneEl.getAttribute('points')
            const coords = ( points ) ? { points } : {
                ulx: zoneEl.getAttribute('ulx'),
                uly: zoneEl.getAttribute('uly'),
                lrx: zoneEl.getAttribute('lrx'),
                lry: zoneEl.getAttribute('lry')    
            }
            zones.push({
                id,...coords,note
            })
        }    
    }
    return zones
}