import axios from 'axios';

import {facsTemplate} from "./tei-template"

export function createFacsFromIIIF( manifestURL, callback ) {
    
    axios.get(manifestURL).then(
        (resp) => {
            const facsDoc = facsTemplate(manifestURL)
            callback(facsDoc)
        },
        (error) => {
            console.log('Unable to load image: ' + error);
        }
    );

    return facsTemplate
}