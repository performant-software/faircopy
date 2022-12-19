import axios from 'axios';
import { manifestToFacsimile2, manifestToFacsimile3 } from './convert-facs'

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

export function searchTree( targetID, node, parent=null, index=0 ) {
    if( node.manifestID === targetID ) {
        return { node, parent, index }
    } else {
        if( node.members ) {
            for( let i=0; i < node.members.length; i++ ) {
                const member = node.members[i]
                const nextTree = searchTree( targetID, member, node, i )
                if( nextTree ) return nextTree
            }
        } 
        return null
    }
}

function parseIIIFPresentation( presentation, nextSurfaceID ) {
    const context = presentation["@context"]
    if( context.includes("http://iiif.io/api/presentation/2/context.json") ) {
        return parsePresentation2( presentation, nextSurfaceID )
    } else if( context.includes("http://iiif.io/api/presentation/3/context.json") ) {
        return parsePresentation3( presentation, nextSurfaceID )
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

function parsePresentation3( presentation, nextSurfaceID ) {
    if( presentation.type === "Manifest") {
        return manifestToFacsimile3(presentation,nextSurfaceID)
    } else {
        throw new Error("Only Manifests are supported for Presentation API v3")
    }    
}

function presentationToCollection2( collection, nextSurfaceID ) {
    const manifestID = collection['@id']
    const name = collection.label
    const members = []

    function parseMember(member) {
        if( member['@type'] === "sc:Manifest") {
            if( member.sequences ) {
                // parse embedded manifest
                members.push(manifestToFacsimile2(member,nextSurfaceID))
            } else {
                // parse manifest reference
                members.push({
                    manifestID: member['@id'],
                    type: 'facs-ref',
                    name: member.label
                })
            }
        } else if( member['@type'] === "sc:Collection" ) {
            members.push(presentationToCollection2(member,nextSurfaceID))
        }
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

    return members.length > 0 ? {
        manifestID,
        name,
        type: 'collection',
        members
    } :
    {
        manifestID,
        name,
        type: 'collection-ref',
    }
}