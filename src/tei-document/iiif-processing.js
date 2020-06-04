import axios from 'axios';

import {facsTemplate} from "./tei-template"

export function createFacsFromIIIF( manifestURL, callback ) {
    axios.get(manifestURL).then(
        (resp) => {
            const facsData = processManifestData(resp.data)
            const facsDoc = facsTemplate(facsData)
            callback(facsDoc)
        },
        (error) => {
            console.log('Unable to load manifest: ' + error);
            callback(null)
        }
    );
}

function processManifestData( manifestData ) {

    // label for manifest
    // determine ids for each surface

    // pull in the first sequence
    // for each canvas:
    // w, h, graphic url, canvas uri

}