import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'

const devEndpoint = 'https://faircopy-activate-2-staging.herokuapp.com/api/public/user_licenses'
const prodEndpoint = 'https://activate.faircopyeditor.com/api/activation'

export function activateLicense(devMode,license,machine_uuid,onActivate,onError) {
    const activationEndpoint = devMode ? devEndpoint : prodEndpoint
    const endPointURL = `${activationEndpoint}/${license}?machine_uuid=${machine_uuid}`
    axios.put(endPointURL).then(
        (resp) => {
            const { expires_at, license_type, secure_id, subscription } = resp.data
            const licenseData = { licenseKey: license, machineID: machine_uuid, activated: true, expires_at, license_type, secure_id, subscription }
            localStorage.setItem('licenseData',JSON.stringify(licenseData))
            onActivate()
        },
        (error) => {
            // problem with the license 
            if( error && error.response && error.response.status === 401 ) {
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