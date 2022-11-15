import axios from 'axios';

export function login(serverURL, email, password, onSuccess, onFail) {
    const authURL = `${serverURL}/api/auth/login`
    const loginData = { email, password }

    axios.post(authURL, loginData).then(
        (okResponse) => {
            const { id, token } = okResponse.data
            setAuthToken( id, serverURL, token )
            onSuccess( id, token )
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

export function logout(email,serverURL) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}
    authTokens[`${email} ${serverURL}`] = null
    localStorage.setItem('authTokens',JSON.stringify(authTokens))
}

function setAuthToken(id, serverURL, token) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}

    authTokens[`${id} ${serverURL}`] = {
        token, 
        createdAt: Date.now()
    }

    localStorage.setItem('authTokens',JSON.stringify(authTokens))
}

export function isLoggedIn( id, serverURL ) {
    return !!getAuthToken(id, serverURL)
}

export function getAuthToken( id, serverURL ) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}
    const authToken = authTokens[`${id} ${serverURL}`]
    // TODO check for expiry
    return authToken?.token 
}

// Axios config object that uses authToken 
export function authConfig( authToken ) {
    return { headers: { 'Authorization': `Bearer ${authToken}`} }
}