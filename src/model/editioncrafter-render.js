const jsdom = require("jsdom")
const { JSDOM } = jsdom
const {CETEI} = require("./CETEI")

const manifestTemplate = require("./templates/manifest.json")
const canvasTemplate = require("./templates/canvas.json")
const annotationTemplate = require("./templates/annotation.json")
const annotationPageTemplate = require("./templates/annotationPage.json")
const { buildSquareFragment, buildPolygonSvg } = require("./svg")

const structuredClone = require('@ungap/structured-clone').default

// Profile ID for EditionCrafter text partials
const textPartialResourceProfileID = 'https://github.com/cu-mkp/editioncrafter-project/text-partial-resource.md'

function convertToHTML( xml ) {
    try {
        const htmlDOM = new JSDOM()
        const ceTEI = new CETEI(htmlDOM.window)
        const xmlDOM = new JSDOM(xml, { contentType: "text/xml" })
        const data = ceTEI.domToHTML5(xmlDOM.window.document)
        return data.outerHTML
    } catch( err ) {
        console.error(`ERROR ${err}: ${err.stack}`)
    }
    return null
}

function scrubTree( el, direction ) {
    let nextEl = direction === 'prev' ? el.previousSibling : el.nextSibling
    while( nextEl ) {
        const nextNextEl = direction === 'prev' ? nextEl.previousSibling : nextEl.nextSibling
        nextEl.parentNode.removeChild(nextEl)
        nextEl = nextNextEl
    }
    if( el.parentNode ) {
        scrubTree( el.parentNode, direction )
    }
}

function generateTextPartial( surfaceID, teiDocumentID, textEl, resourceType ) {
    const partialTextEl = textEl.cloneNode(true)
    const facsElement = resourceType === 'sourceDoc' ? 'surface' : 'pb'
    const facsEls = partialTextEl.getElementsByTagName(facsElement)

    if( facsElement === 'pb' ) {
        return extractPb( facsEls, partialTextEl, surfaceID, teiDocumentID )
    } else if( facsElement === 'surface' ) {
        return extractSurface( facsEls, surfaceID, teiDocumentID )
    }

    return null
}

function extractPb(pbEls, partialTextEl, surfaceID, teiDocumentID) {
    for( let i=0; i < pbEls.length; i++ ) {
        const pbEl = pbEls[i]
        const pbSurfaceID = pbEl.getAttribute('facs')

        if ( pbSurfaceID && matchID( pbSurfaceID, surfaceID, teiDocumentID ) ) {
            const nextPbEl = pbEls[i+1]
            scrubTree( pbEl, 'prev' )
            if( nextPbEl ) {
                scrubTree( nextPbEl, 'next' )
                nextPbEl.parentNode.removeChild(nextPbEl)
            }
            return partialTextEl.outerHTML
        }
    }
    return null
}

function extractSurface(surfaceEls, surfaceID, teiDocumentID) {
    for( let i=0; i < surfaceEls.length; i++ ) {
        const surfaceEl = surfaceEls[i]
        const surfaceElID = surfaceEl.getAttribute('facs')

        if ( surfaceElID && matchID( surfaceElID, surfaceID, teiDocumentID ) ) {
            return surfaceEl.outerHTML
        }
    }
    return null
}

function matchID( facsURL, surfaceID, teiDocumentID ) {
    const idParts = facsURL.split('#')
    return ( idParts.length > 1 && idParts[1] === surfaceID && (idParts[0] === '' || idParts[0] === teiDocumentID) )
}

function generateTextPartials( surfaceID, teiDocumentID, textEls, resourceType ) {
    const xmls = {}
    for( const textEl of textEls ) {
        const localID = textEl.getAttribute('xml:id')
        const xml = generateTextPartial( surfaceID, teiDocumentID, textEl, resourceType )
        if( xml ) xmls[localID] = xml
    }
    return xmls
}

function generateWebPartials( xmls ) {
    const htmls = {}
    for( const id of Object.keys(xmls) ) {
        const xml = xmls[id]
        htmls[id] = convertToHTML( xml )
    }
    return htmls
}

function renderTextAnnotation( annotationPageID, canvasID, textURL, annoID, format) {
    const annotation = structuredClone(annotationTemplate)
    annotation.id = `${annotationPageID}/annotation/${annoID}`
    annotation.motivation = "supplementing"
    annotation.target = canvasID
    annotation.body.id = textURL
    annotation.body.type = "TextPartial"
    annotation.body.profile = textPartialResourceProfileID
    annotation.body.format = format
    return annotation
}

function renderTextAnnotationPage( baseURI, canvasID, surface, apIndex ) {
    const { id: surfaceID, xmls, htmls } = surface
    if( Object.keys(xmls).length == 0 && Object.keys(htmls).length == 0 ) return null
    const annotationPageID = `${canvasID}/annotationPage/${apIndex}`
    const annotationPage = structuredClone(annotationPageTemplate)
    annotationPage.id = annotationPageID
    let i = 0
    for( const localID of Object.keys(xmls) ) {
        const xmlURL = `${baseURI}/tei/${localID}/${surfaceID}.xml`
        const annotation = renderTextAnnotation( annotationPageID, canvasID, xmlURL, i++, "text/xml" )
        annotationPage.items.push(annotation)
    }
    for( const localID of Object.keys(htmls) ) {
        const htmlURL = `${baseURI}/html/${localID}/${surfaceID}.html`
        const annotation = renderTextAnnotation( annotationPageID, canvasID, htmlURL, i++, "text/html" )
        annotationPage.items.push(annotation)
    }
    return annotationPage
}

// Builds a painting annotation for the `items` array
function buildItemAnnotation (canvas, surface, thumbnailWidth, thumbnailHeight) {
    const annotation = structuredClone(annotationTemplate)
    const { imageURL, width, height } = surface

    annotation.id = `${canvas.items[0].id}/annotation/0`
    annotation.motivation = 'painting'
    annotation.target = canvas.id
    annotation.body.id = imageURL
    annotation.body.type = "Image"
    annotation.body.format = "image/jpeg"
    annotation.body.height = height
    annotation.body.width = width
    annotation.body.service = [{
        id: imageURL,
        type: "ImageService2",
        profile: "http://iiif.io/api/image/2/level2.json",
    }]
    annotation.body.thumbnail = [{
        id: `${imageURL}/full/${thumbnailWidth},${thumbnailHeight}/0/default.jpg`,
        format: "image/jpeg",
        type: "ImageService2",
        profile: "http://iiif.io/api/image/2/level2.json",
    }]

    return annotation
}

// Builds a tagging annotation for the `annotations` array
function buildTagAnnotations (surface) {
    const { zones } = surface;

    return zones.map(zone => {
        const annotation = structuredClone(annotationTemplate)

        annotation.id = `#${zone.id}`
        annotation.motivation = 'tagging'
        annotation.body = [{
            type: 'TextualBody',
            purpose: 'tagging',
            format: 'text/html',
            // Fill value with the first HTML string in the surface
            value: surface.htmls[Object.keys(surface.htmls)[0]]
        }]

        if (zone.points) {
            const svg = buildPolygonSvg(zone.points)
            annotation.target = {
                selector: [{
                    type: 'SvgSelector',
                    value: svg
                }]
            }
        } else if (zone.ulx && zone.uly && zone.lrx && zone.lry) {
            const fragment = buildSquareFragment(zone.ulx, zone.uly, zone.lrx, zone.lry)
            annotation.target = {
                selector: [{
                    conformsTo: 'http://www.w3.org/TR/media-frags/',
                    type: 'FragmentSelector',
                    value: fragment
                }]
            }
        } else {
            console.log('Missing one or more position properties for ', annotation.id)
        }

        return annotation
    })
}

function renderManifest( manifestLabel, baseURI, surfaces, thumbnailWidth, thumbnailHeight, glossaryURL) {
    const manifest = structuredClone(manifestTemplate)
    manifest.id = `${baseURI}/iiif/manifest.json`
    manifest.label = { en: [manifestLabel] }

    for( const surface of Object.values(surfaces) ) {
        const { id, label, width, height } = surface

        const canvas = structuredClone(canvasTemplate)
        canvas.id = `${baseURI}/iiif/canvas/${id}`
        canvas.height = height
        canvas.width = width
        canvas.label = { "none": [ label ] }
        canvas.items[0].id = `${canvas.id}/annotationpage/0`

        const itemAnnotation = buildItemAnnotation(canvas, surface, thumbnailWidth, thumbnailHeight)

        canvas.items[0].items.push(itemAnnotation)

        canvas.annotations = buildTagAnnotations(surface)
        const annotationPage = renderTextAnnotationPage(baseURI, canvas.id, surface, 1)
        if( annotationPage ) canvas.annotations.push(annotationPage)
        manifest.items.push( canvas )
    }

    if (glossaryURL) {
        manifest.seeAlso = [
            {
                id: glossaryURL,
                type: "Dataset",
                label: "Glossary",
                format: "text/json",
                // the spec says we "SHOULD" include a profile field
                // but I don't know what the URL would be in this case
            }
        ]
    }

    const manifestJSON = JSON.stringify(manifest, null, '\t')
    return manifestJSON
}

function parseSurfaces(doc, teiDocumentID) {
    // gather resource elements
    const facsEl = doc.getElementsByTagName('facsimile')[0]
    const textEls = doc.getElementsByTagName('text')
    const sourceDocEls = doc.getElementsByTagName('sourceDoc')
    const surfaceEls = facsEl.getElementsByTagName('surface')

    // parse invididual surfaces and partials
    const surfaces = {}
    for( const surfaceEl of surfaceEls ) {
        const id = surfaceEl.getAttribute('xml:id')
        const labelEl = surfaceEl.getElementsByTagName('label')[0]
        const label = labelEl.textContent
        const graphicEl = surfaceEl.getElementsByTagName('graphic')[0]
        const imageURL = graphicEl.getAttribute('url')
        const width = parseInt(surfaceEl.getAttribute('lrx'))
        const height = parseInt(surfaceEl.getAttribute('lry'))
        const surface = { id, label, imageURL, width, height }
        const textXMLs = generateTextPartials(id, teiDocumentID, textEls, 'text')
        const sourceDocXMLs = generateTextPartials(id, teiDocumentID, sourceDocEls, 'sourceDoc')
        surface.xmls = { ...textXMLs, ...sourceDocXMLs }
        surface.htmls = generateWebPartials(surface.xmls)

        const zoneEls = surfaceEl.getElementsByTagName('zone')
        if (zoneEls.length > 0) {
            surface.zones = []

            for (const zoneEl of zoneEls) {
                surface.zones.push({
                    id: zoneEl.getAttribute('xml:id'),
                    ulx: zoneEl.getAttribute('ulx'),
                    uly: zoneEl.getAttribute('uly'),
                    lrx: zoneEl.getAttribute('lrx'),
                    lry: zoneEl.getAttribute('lry'),
                    points: zoneEl.getAttribute('points')
                })
            }
        } else {
            surface.zones = []
        }

        surfaces[id] = surface
    }

    return surfaces
}

function validateTEIDoc(doc) {
    // TODO needs to have exactly 1 facs. needs to be a valid xml doc
    return 'ok'
}

function renderResources( doc, htmlDoc ) {
    const resourceTypes = [ 'text', 'sourceDoc' ]
    const resources = {}

    for( const resourceType of resourceTypes ) {
        const resourceEls = doc.getElementsByTagName(resourceType)
        const resourceHTMLEls = htmlDoc.getElementsByTagName(`tei-${resourceType}`)

        for( const resourceEl of resourceEls ) {
            const resourceID = resourceEl.getAttribute('xml:id')
            if( !resources[resourceID] ) resources[resourceID] = {}
            resources[resourceID].xml = resourceEl.outerHTML
        }

        for( const resourceHTMLEl of resourceHTMLEls ) {
            const resourceID = resourceHTMLEl.getAttribute('xml:id')
            if( !resources[resourceID] ) resources[resourceID] = {}
            resources[resourceID].html = resourceHTMLEl.outerHTML
        }
    }

    return resources
}

export function renderTEIDocument(xml, options) {
    const { baseURL, teiDocumentID, thumbnailWidth, thumbnailHeight } = options
    const doc = new JSDOM(xml, { contentType: "text/xml" }).window.document
    const status = validateTEIDoc(doc)
    if( status !== 'ok' ) return { error: status }

    // render complete HTML
    const htmlDOM = new JSDOM()
    const ceTEI = new CETEI(htmlDOM.window)
    const htmlDoc = ceTEI.domToHTML5(doc)
    const html = htmlDoc.outerHTML

    // render resources
    const resources = renderResources( doc, htmlDoc )

    // render manifest and partials
    const surfaces = parseSurfaces(doc, teiDocumentID)
    const documentURL = `${baseURL}/${teiDocumentID}`
    // TODO temporary hardcode
    const glossaryURL = 'https://cu-mkp.github.io/editioncrafter-data/fr640_3r-3v-example/glossary.json'
    const manifest = renderManifest( teiDocumentID, documentURL, surfaces, thumbnailWidth, thumbnailHeight, glossaryURL )

    return {
        id: teiDocumentID,
        xml,
        html,
        manifest,
        resources,
        surfaces
    }
}