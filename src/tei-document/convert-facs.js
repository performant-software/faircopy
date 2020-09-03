import {facsTemplate} from "./tei-template"

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
                let id = getIDfromURI(canvasURI)
                if( !id || surfaceIDs.includes(id) ) {
                    id = generateOrdinalID('page-',n)
                }
                localLabels = !localLabels ? id : localLabels
                surfaceIDs.push(id)
                n++ // page count

                surfaces.push({
                    id,
                    localLabels,
                    width,
                    height,
                    imageAPIURL,
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
        let id = getIDfromURI(canvasURI)      
        // fallback to page number if we can't create a unique ID from canvas ID 
        if( !id || surfaceIDs.includes(id) ) {
            id = generateOrdinalID('page-',n)
        }  
        surfaceIDs.push(id)
        n++ // page count

        surfaces.push({
            id,
            localLabels,
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
        const labelEls = surfaceEl.getElementsByTagName('label')
        const localLabels = getLocalLabels(labelEls)

        surfaces.push({
            id,
            canvasURI,
            localLabels,
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

function getIDfromURI(uri) {
    const parts = uri.split('/')
    const lastIndex = parts.length - 1
    return parts[lastIndex]
}

function generateOrdinalID( prefix, ordinalID ) {
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