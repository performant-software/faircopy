import axios from 'axios';
import { manifestToFacsimile2 } from './convert-facs'

export function importPresentationEndpoint(manifestURL, nextSurfaceID, onSuccess, onError) {
    axios.get(manifestURL).then(
        (resp) => {
            try {
                const iiifTree = parseIIIFPresentation(resp.data, nextSurfaceID)
                onSuccess(iiifTree)
            } catch(error) {
                onError(`Unable to parse IIIF manifest: '${error}`)      
            }
        },
        (error) => {
            onError(`Unable to load IIIF manifest.`)
        }
    );
}

function parseIIIFPresentation( presentation, nextSurfaceID ) {
    const context = presentation["@context"]
    if( context.includes("http://iiif.io/api/presentation/2/context.json") ) {
        return parsePresentation2( presentation, nextSurfaceID )
    }
    throw new Error("Expected IIIF Presentation API context 2.")
}

function parsePresentation2( presentation, nextSurfaceID ) {
    if( presentation['@type'] === "sc:Manifest") {
        return manifestToFacsimile2(presentation,nextSurfaceID)
    } else if( presentation['@type'] === "sc:Collection" ) {
        return presentationToCollection2(presentation,nextSurfaceID)
    }    
}

function presentationToCollection2( collection, nextSurfaceID ) {
    const id = collection['@id']
    const name = collection.label
    const members = []

    function parseMember(member) {
        // TODO
        members.push(parsePresentation2(member, nextSurfaceID))
    }

    if( collection.collections ) {
        for( const member of collection.collections ) {
            parseMember(member)
        }    
    }

    if( collection.manifests ) {
        for( const member of collection.manifests ) {
            parseMember(member)
        }    
    }

    if( collection.members ) {
        for( const member of collection.members ) {
            parseMember(member)
        }    
    }

    return {
        id,
        name,
        members
    }
}