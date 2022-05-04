import axios from 'axios';

export function login(serverURL, email, password, onSuccess, onFail) {
    const authURL = `${serverURL}/api/auth/login`
    const loginData = { email, password }

    axios.post(authURL, loginData).then(
        (okResponse) => {
            const { token } = okResponse.data
            setAuthToken( email, serverURL, token )
            onSuccess(token)
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

function setAuthToken(email, serverURL, token) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}

    authTokens[`${email} ${serverURL}`] = {
        token, 
        createdAt: Date.now()
    }

    localStorage.setItem('authTokens',JSON.stringify(authTokens))
}

export function getAuthToken( email, serverURL ) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}
    return authTokens[`${email} ${serverURL}`]
}

// Axios config object that uses authToken 
export function authConfig( authToken ) {
    return { headers: { 'Authorization': `Bearer ${authToken}`} }
}