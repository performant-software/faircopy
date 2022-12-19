import {facsTemplate} from "./tei-template"
import { getLocalString } from './iiif-util'
import { sanitizeID } from './attribute-validators'

const fromThePageTEIXML = 'https://github.com/benwbrum/fromthepage/wiki/FromThePage-Support-for-the-IIIF-Presentation-API-and-Web-Annotations#tei-xml'

export function manifestToFacsimile3( manifestData, nextSurfaceID ) {
    if( manifestData.type !== "Manifest" ) throw new Error("Expected a manifest as the root object.")

    const canvases = manifestData.items
    const manifestID = val('id', manifestData)
    const manifestLabel = str( manifestData.label )

    const surfaceIDs = []
    const surfaces = []
    let n=nextSurfaceID
    for( const canvas of canvases ) {
        if( canvas.type !== "Canvas" ) throw new Error("Expected a Canvas item.")
        const canvasURI = canvas.id
        const annotationPage = canvas.items[0]
        const {width: canvasWidth, height: canvasHeight} = canvas
        if( !annotationPage || annotationPage.type !== "AnnotationPage" ) throw new Error("Expected an Annotation Page item.")
        const annotations = annotationPage.items
        for( const annotation of annotations ) {
            if( annotation.type !== "Annotation" ) throw new Error("Expected an Annotation item.")
            if( annotation.motivation === "painting" && annotation.body && annotation.body.type === "Image" ) {
                const {body} = annotation
                // width and height might be on Annotation or the Canvas
                const width = isNaN(body.width) ? canvasWidth : body.width
                const height = isNaN(body.height) ? canvasHeight : body.height

                let imageAPIURL
                if( body.service ) {
                    for( const serving of body.service ) {
                        const servingType = val('type', serving)
                        if( servingType === "ImageService2" || servingType === "ImageService3") {
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
                    texts: [],
                    canvasURI
                })  
                break // one surface per canvas      
            }
        } 
    }

    const { name, requestedID } = parseMetadata(manifestID,manifestLabel)

    return { 
        id: requestedID,
        name,
        type: 'facs',
        manifestID,
        texts: [],
        surfaces
    }
}

export function manifestToFacsimile2( manifestData, nextSurfaceID ) {
    const { sequences } = manifestData
    const manifestID = val('id', manifestData)
    const manifestLabel = str( manifestData.label )

    const sequence = sequences[0]
    const { canvases } = sequence

    const texts = sequence.rendering ? gatherRenderings2( sequence.rendering ) : []

    const surfaceIDs = []
    const surfaces = []
    let n=nextSurfaceID
    for( const canvas of canvases ) {
        const { images, width, height } = canvas
        const canvasURI = val('id', canvas)
        const image = images[0]
        const { resource } = image
        const imageAPIURL = resource.service ? val('id', resource.service) : val('id', resource)
        const localLabels = str( canvas.label )
        let id = generateOrdinalID('f',n)
        const texts = canvas.seeAlso ? parseSeeAlso2(canvas.seeAlso) : []
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
            texts,
            canvasURI
        })
    }
    const { name, requestedID } = parseMetadata(manifestID,manifestLabel)

    return { 
        id: requestedID,
        name,
        type: 'facs',
        manifestID,
        texts,
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
    surface.localLabels[key] = [ title ]
} 

function gatherRenderings2( rendering ) {
    const texts = []

    // add texts that are in a recognized format to list of texts
    function parseRendering( rend ) {
        if( rend['@id'] && rend['label'] ) {
            let format = parseFormat(rend)
            if( format ) {
                texts.push({
                    manifestID: rend['@id'],
                    name: rend['label'],
                    format
                })    
            }
        }
    }

    // gather up any tei or plain text renderings and return an array of text refs 
    if( Array.isArray(rendering) ) {
        for( const rend of rendering ) {
            parseRendering(rend)
        }
    } else {
        parseRendering(rendering)
    }   

    return texts
}

function parseSeeAlso2(seeAlso) {
    if( !Array.isArray(seeAlso) ) return []
    const texts = []

    for( const rend of seeAlso ) {
        if( rend['@id'] && rend['label'] ) {
            const format = parseFormat(rend)
            if( format ) {    
                texts.push({
                    manifestID: rend['@id'],
                    name: rend['label'],
                    format
                })
            }    
        }
    }

    return texts
}

function parseMetadata(manifestID,manifestLabel) {
    const name = getLocalString( manifestLabel, 'en' ).join(' ')

    // take the pathname and convert it to a valid local ID
    const url = new URL(manifestID)
    const cleanID = sanitizeID(url.pathname)
    const requestedID = cleanID ? cleanID : `import_${Date.now()}`

    return {
        name,
        requestedID
    }
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

function parseFormat( rend ) {
    let format = rend['format'] === 'text/plain' ? 'text' : rend['format'] === 'application/tei+xml' ? 'tei' : null

    if( !format && rend['profile'] === fromThePageTEIXML ) {
        format = 'tei'
    }
    return format
}


function parseZones( surfaceEl ) {
    const zones = []
    const zoneEls = surfaceEl.getElementsByTagName('zone')
    if( zoneEls ) {
        for( let i=0; i < zoneEls.length; i++ ) {
            const zoneEl = zoneEls[i]
            const id = zoneEl.getAttribute('xml:id')
            const noteEls = zoneEl.getElementsByTagName('note')
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