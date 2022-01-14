import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'

const devEndpoint = 'https://faircopy-activate-2-staging.herokuapp.com/api/public/user_licenses'
const prodEndpoint = 'https://activate.faircopyeditor.com/api/activation'

export function activateLicense(devMode,license,machine_uuid,onActivate,onError) {
    const activationEndpoint = devMode ? devEndpoint : prodEndpoint
    const endPointURL = `${activationEndpoint}/${license}?machine_uuid=${machine_uuid}`
    axios.put(endPointURL).then(
        (resp) => {
            const { expires_at, license_type, secure_id, subscription, activation_token } = resp.data
            const licenseData = { 
                licenseKey: license, 
                machineID: machine_uuid, 
                activated: true, 
                expiresAt: expires_at, 
                licenseType: license_type, 
                secureID: secure_id,
                activationToken: activation_token, 
                subscription 
            }
            localStorage.setItem('licenseData',JSON.stringify(licenseData))
            onActivate()
        },
        (error) => {
            // problem with the license 
            if( error && error.response && error.response.status === 400 ) {
                const errorMessage = error.response.data.errors.base[0]
                onError(errorMessage)    
            } else {
                onError("Unable to connect to server.")
            }
        }
    );
}

export function licenseDaysLeft() {
    const licenseData = JSON.parse(localStorage.getItem('licenseData'))
    const { expiresAt } = licenseData 
    const now = Date.now()
    const expireDate = new Date(expiresAt)
    const diffTime = Math.abs(now - expireDate);
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return daysLeft
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