import axios from 'axios';

const devFeedbackURL = 'https://faircopy-activate-2-staging.herokuapp.com/api/public/feedback'
const prodFeedbackURL = 'https://faircopyeditor.com/api/public/feedback'

export function sendFeedback(devMode,message,version,onSuccess,onError) {

    const licenseDataJSON = localStorage.getItem('licenseData')
    const licenseData = JSON.parse(licenseDataJSON)
    const { licenseKey } = licenseData

    const feedbackURL = devMode ? devFeedbackURL : prodFeedbackURL

    axios.post(feedbackURL, {
        feedback: { version, license_key: licenseKey, message }
    }).then(
        (resp) => {
            onSuccess()
        },
        (error) => {
            onError("Unable to connect to server.")
        }
    );
}