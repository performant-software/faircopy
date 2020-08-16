import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'

const activationEndpoint = 'https://activate.faircopyeditor.com/activation'
// const activationEndpoint = 'http://localhost:3000/activation'

export function activateLicense(license,machine_uuid,onActivate,onError) {
    axios.post(activationEndpoint, {
        customer: {
            license,
            machine_uuid    
        }
    }).then(
        (resp) => {
            // successful activation
            const licenseData = { licenseKey: license, machineID: machine_uuid, activated: true }
            localStorage.setItem('licenseData',JSON.stringify(licenseData))
            onActivate()
        },
        (error) => {
            // problem with the license 
            if( error && error.response && error.response.status === 403 ) {
                const errorMessage = error.response.data.status
                onError(errorMessage)    
            } else {
                onError("Unable to connect to server.")
            }
        }
    );
}

export function initLicenseData() {
    const licenseData = {
        activated: false,
        licenseKey: '',
        machineID: uuidv4()
    }
    localStorage.setItem('licenseData',JSON.stringify(licenseData))
    return licenseData
}