
export function parseIIIFPresentation( presentation, nextSurfaceID ) {
    const context = presentation["@context"]
    if( context.includes("http://iiif.io/api/presentation/2/context.json") ) {
        return parsePresentation2( presentation, nextSurfaceID )
    }
    throw new Error("Expected IIIF Presentation API context 2.")
}

function parsePresentation2( presentation, nextSurfaceID ) {
    // there may be collections or manifests here, 
    // or the top level object might be a single manifest
    // @type "sc:Collection"
    const { facsData, metadata } = manifestToFacsimile2(presentation,nextSurfaceID)
    // TODO what does a iiifTree look like with just one manifest in it?
}