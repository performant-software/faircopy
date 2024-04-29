const baseURL = 'file://ec/'

class EditionCrafterServer {

    constructor() {
        this.teiDocuments = {}
    }

    addTEIDocument(teiDocumentID, teiDocument) {
        this.teiDocuments[teiDocumentID] = teiDocument
    }

    getTEIDocument( teiDocumentID, resourceType ) {
        const teiDocument = this.teiDocuments[teiDocumentID]
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

    getResource( teiDocumentID, resourceType, resourceID ) {
        const teiDocument = this.teiDocuments[teiDocumentID]
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

    getSurface( teiDocumentID, resourceType, resourceID, surfaceID ) {
        const teiDocument = this.teiDocuments[teiDocumentID]
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

    processRequest(url) {
        const params = url.replace(baseURL,'').split('/')

        if( params.length > 0) {
            const teiDocumentID = params[0]
            if( !this.teiDocuments[teiDocumentID] ) {
                return { error: `Editioncrafter document not found: ${teiDocumentID}` }
            }
            if( params.length === 1 ) {
                return this.getTEIDocument( teiDocumentID, 'tei' )
            } else if( params.length >= 2 ) {
                const resourceType = params[1]
                if( params.length === 2 ) {
                    return this.getTEIDocument( teiDocumentID, resourceType )
                } else {
                    const resourceID = params[2]
                    if( params.length === 3 ) {
                        if( resourceType === 'iiif' && resourceID === 'manifest.json' ) {
                            return this.getTEIDocument(teiDocumentID,'iiif')
                        } else if( resourceType === 'tei' && resourceID === 'index.xml') {
                            return this.getTEIDocument(teiDocumentID,'tei')
                        } else if( resourceType === 'html' && resourceID === 'index.html') {
                            return this.getTEIDocument(teiDocumentID,'html')
                        } else {
                            return this.getResource( teiDocumentID, resourceType, resourceID )
                        }
                    } else {
                        const surfaceID = params[3]
                        if( params.length === 4 ) {
                            const surfaceIDParts = surfaceID.split('.')
                            return this.getSurface( teiDocumentID, resourceType, resourceID, surfaceIDParts[0] )    
                        }
                    }
                }
            }
        }

        return { error: `Invalid Editioncrafter URL: ${url}` }
    }
}

exports.EditionCrafterServer = EditionCrafterServer