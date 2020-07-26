import {facsTemplate} from "./tei-template"

// Supports IIIF v2 and v3
export function iiifToFacsimile( manifestData ) {
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
        const labels = str( 'label', canvas, 'en' )
        const label = labels && labels[0] ? labels[0] : ""
        let id = getIDfromURI(canvasURI)      
        // fallback to page number if we can't create a unique ID from canvas ID 
        if( !id || surfaceIDs.includes(id) ) {
            id = generateOrdinalID('page-',n)
        }  
        surfaceIDs.push(id)
        n++ // page count

        surfaces.push({
            id,
            label,
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

// For string value compliance with IIIF v3 (see: https://iiif.io/api/presentation/3.0/#44-language-of-property-values)
function str( key, obj, lang ) {
    const values = obj[key]
    // IIIF v2 doesn't have localized values
    if( typeof values === 'string' ) {
        return [ values ]
    } else {
        const langKeys = Object.keys(values)

        // No values provided
        if( langKeys.length === 0 ) return []

        // If all of the values are associated with the none key, the client must display all of those values.
        if( langKeys.includes('none') && langKeys.length === 1) {
            return values['none']
        }
        // If any of the values have a language associated with them, the client must display all of the values associated with the language that best matches the language preference.
        if( values[lang] ) {
            return values[lang]
        } 
        if( !langKeys.includes('none') ) {
            // If all of the values have a language associated with them, and none match the language preference, the client must select a language and display all of the values associated with that language.
            return values['en'] ? values['en'] : values[langKeys[0]]
        } else {
            // If some of the values have a language associated with them, but none match the language preference, the client must display all of the values that do not have a language associated with them.
            return values['none']
        }
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