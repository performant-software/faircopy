import axios from 'axios'

export function login(serverURL, onSuccess, onFail) {
    window.fairCopy.startAuthServer(serverURL).then((result) => {
        if (!result.success) {
            onFail(result.error || 'Failed to start auth server')
            return
        }
        
        window.fairCopy.ipcRegisterCallbackOnce('authTokenReceived', (event, tokenData) => {
            console.log('Received auth token data:', tokenData)
            if (tokenData && tokenData.token) {
                setAuthToken(tokenData.userID, serverURL, tokenData.token, tokenData.organizations)
                onSuccess(tokenData.userID, tokenData.token)
            } else {
                onFail('Authentication failed')
            }
        })
    }).catch((error) => {
        onFail(error.message || 'Failed to start auth server')
    })
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