import axios from 'axios';
import { parseIIIFPresentation } from './iiif-presentation';

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

export function getImageInfoURL( surface ) {
    const slash = surface.imageAPIURL.endsWith('/') ? '' : '/'
    return `${surface.imageAPIURL}${slash}info.json`
}

// For string value compliance with IIIF v3 (see: https://iiif.io/api/presentation/3.0/#44-language-of-property-values)
export function getLocalString( values, lang ) {
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
