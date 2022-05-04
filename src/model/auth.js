import axios from 'axios';

var authToken = null

export function login(serverURL, email, password, onSuccess, onFail) {
    const authURL = `${serverURL}/api/auth/login`
    const loginData = { email, password }

    axios.post(authURL, loginData).then(
        (okResponse) => {
            const { token } = okResponse.data
            setAuthToken(token)
            onSuccess()
        },
        (errorResponse) => {
            // problem with the license 
            if( errorResponse && errorResponse.response ) {
                if( errorResponse.response.status === 401 ) {
                    const { error } = errorResponse.response.data
                    onFail(error)        
                }
            } else {
                onFail("Unable to connect to server.")
            }
        }
    )
}

function setAuthToken(token) {
    authToken = token
}

export function getAuthToken() {
    return authToken
}