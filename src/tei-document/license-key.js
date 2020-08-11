import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'

const activationEndpoint = 'http://localhost:3000/activation'

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
            onError('An error occurred.')
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