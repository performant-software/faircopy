import axios from 'axios'

export function login(serverURL, email, password, onSuccess, onFail) {
    const authURL = `${serverURL}/api/auth/login`
    const loginData = { email, password }

    axios.post(authURL, loginData).then(
        (okResponse) => {
            const { id, token, organizations } = okResponse.data
            setAuthToken(id, serverURL, token, organizations)
            onSuccess(id, token)
        },
        (errorResponse) => {
            // problem with the license 
            if (errorResponse && errorResponse.response) {
                if (errorResponse.response.status === 401) {
                    const { error } = errorResponse.response.data
                    onFail(error)
                }
            } else {
                onFail("Unable to connect to server.")
            }
        }
    )
}

export function logout(userID, serverURL) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}
    authTokens[`${userID} ${serverURL}`] = null
    localStorage.setItem('authTokens', JSON.stringify(authTokens))
}

function setAuthToken(userID, serverURL, token, organizations) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}

    authTokens[`${userID} ${serverURL}`] = {
        token,
        organizations,
        createdAt: Date.now()
    }

    localStorage.setItem('authTokens', JSON.stringify(authTokens))
}

export function isLoggedIn(id, serverURL) {
    return !!getAuthToken(id, serverURL)
}

export function getAuthToken(userID, serverURL) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}
    const authToken = authTokens[`${userID} ${serverURL}`]
    // TODO check for expiry
    return authToken?.token
}

export function getUserOrganizations(userID, serverURL) {
    const authTokensJSON = localStorage.getItem('authTokens')
    const authTokens = authTokensJSON ? JSON.parse(localStorage.getItem('authTokens')) : {}
    const authToken = authTokens[`${userID} ${serverURL}`]
    return authToken?.organizations
}

// Axios config object that uses authToken 
export function authConfig(authToken, timeout = 60000) {
    return { timeout: timeout, headers: { 'Authorization': `Bearer ${authToken}` } }
}