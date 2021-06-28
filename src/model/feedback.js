import axios from 'axios';

const devFeedbackURL = 'https://faircopy-activate-dev.netlify.app/api/feedback'
const prodFeedbackURL = 'https://activate.faircopyeditor.com/api/feedback'

export function sendFeedback(devMode,message,version,onSuccess,onError) {

    const licenseDataJSON = localStorage.getItem('licenseData')
    const licenseData = JSON.parse(licenseDataJSON)
    const { licenseKey } = licenseData

    const feedbackURL = devMode ? devFeedbackURL : prodFeedbackURL

    axios.post(feedbackURL, {
        feedback: { version, licenseKey, message }
    }).then(
        (resp) => {
            onSuccess()
        },
        (error) => {
            onError("Unable to connect to server.")
        }
    );
}