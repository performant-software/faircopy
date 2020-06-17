import axios from 'axios';
import {iiifToFacsimile, facsimileToTEI} from './convert-facs'

export function importIIIFManifest( manifestURL, callback ) {
    axios.get(manifestURL).then(
        (resp) => {
            const facsData = iiifToFacsimile(resp.data)
            const facsXML = facsimileToTEI(facsData)
            callback(facsXML,facsData)
        },
        (error) => {
            console.log(`Unable to load IIIF manifest ${manifestURL} :\n'${error}`);
            callback(null)
        }
    );
}

export function getImageInfoURL( surface ) {
    const slash = surface.imageAPIURL.endsWith('/') ? '' : '/'
    return `${surface.imageAPIURL}${slash}info.json`
}

export function getThumbnailURL( surface, width=120 ) {
    const { imageAPIURL } = surface
    const slash = imageAPIURL.endsWith('/') ? '' : '/'
    return `${imageAPIURL}${slash}full/${width},/0/default.jpg`
}