import axios from 'axios'

const AUTH_SERVER_PORT = 3847

export function login(serverURL, onSuccess, onFail) {
    window.fairCopy.ipcRegisterCallbackOnce('authTokenReceived', (event, tokenData) => {
        if (tokenData && tokenData.token) {
            setAuthToken(tokenData.id, tokenData.server, tokenData.token, tokenData.organizations)
            onSuccess(tokenData.id, tokenData.server, tokenData.token)
        } else {
            onFail('Authentication failed')
        }
    })
    
    window.fairCopy.startAuthServer(serverURL).then((result) => {
        if (!result.success) {
            onFail(result.error || 'Failed to start auth server')
            return
        }
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

    console.log('Setting auth token for', userID, serverURL)
    console.log('token: ', token)

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
    return {
        timeout: timeout,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'client': 'faircopy-desktop'
        } }
}