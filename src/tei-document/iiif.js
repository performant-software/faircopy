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