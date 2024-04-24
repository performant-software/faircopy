import { renderTEIDocument } from "./render"

const thumbnailWidth = 124
const thumbnailHeight = 192

// keep a cache here of documents that have been processed
const teiDocuments = {}

function getTEIDocument( teiDocumentID, resourceType ) {
    const teiDocument = teiDocuments[teiDocumentID]
    if( teiDocument ) {
        if( resourceType === 'tei' ) {
            return teiDocument.xml
        } else if( resourceType === 'html' ) {
            return teiDocument.html
        } else if( resourceType === 'iiif' ) {
            return teiDocument.manifest
        }    
    }
    return null
}

function getResource( teiDocumentID, resourceType, resourceID ) {
    const teiDocument = teiDocuments[teiDocumentID]
    if( teiDocument ) {
        const resource = teiDocument.resources[resourceID] 
        if( resource ) {
            if( resourceType === 'tei' ) {
                return resource.xml
            } else if( resourceType === 'html' ) {
                return resource.html
            }            
        }    
    }
    return null
}

function getSurface( teiDocumentID, resourceType, resourceID, surfaceID ) {
    const teiDocument = teiDocuments[teiDocumentID]
    if( teiDocument ) {
        const surface = teiDocument.surfaces[surfaceID]
        if( surface ) {
            let partials = null
            if( resourceType === 'tei' ) {
                partials = surface.xmls
            } else if( resourceType === 'html' ) {
                partials = surface.htmls
            }
            const partial = partials[resourceID]
            if( partial ) return partial
        }
    }
    return null
}

export function processRequest(url) {
    const params = url.replace('ec://','').split('/')

    if( params.length > 0) {
        const teiDocumentID = params[0]
        if( !teiDocuments[teiDocumentID] ) {
            throw new Error(`Editioncrafter document not found: ${teiDocumentID}`)
        }
        if( params.length === 1 ) {
            return getTEIDocument( teiDocumentID, 'tei' )
        } else if( params.length >= 2 ) {
            const resourceType = params[1]
            if( params.length === 2 ) {
                return getTEIDocument( teiDocumentID, resourceType )
            } else {
                const resourceID = params[2]
                if( params.length === 3 ) {
                    if( resourceType === 'iiif' && resourceID === 'manifest.json' ) {
                        return getTEIDocument(teiDocumentID,'iiif')
                    } else if( resourceType === 'tei' && resourceID === 'index.xml') {
                        return getTEIDocument(teiDocumentID,'tei')
                    } else if( resourceType === 'html' && resourceID === 'index.html') {
                        return getTEIDocument(teiDocumentID,'html')
                    } else {
                        return getResource( teiDocumentID, resourceType, resourceID )
                    }
                } else {
                    const surfaceID = params[3]
                    if( params.length === 4 ) {
                        const surfaceIDParts = surfaceID.split('.')
                        return getSurface( teiDocumentID, resourceType, resourceID, surfaceIDParts[0] )    
                    }
                }
            }
        }
    }

    throw new Error(`Invalid Editioncrafter URL: ${url}`)
}

export function processTEIDocument(teiDocumentID, xml) {
    const baseURL = 'ec://'
    const renderOptions = { teiDocumentID, baseURL, thumbnailWidth, thumbnailHeight } 
    const teiDoc = renderTEIDocument(xml, renderOptions)
    teiDocuments[teiDocumentID] = teiDoc
}