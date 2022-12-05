import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

const configFilename = 'config-settings.json'

export function getConfig( projectID, serverURL, authToken, onSuccess, onFail) {
    const getConfigURL = `${serverURL}/api/configs/${projectID}`

    axios.get(getConfigURL,authConfig(authToken)).then(
        (okResponse) => {
            const { config_content, last_action } = okResponse.data.config
            onSuccess(config_content, last_action)
        }, 
        standardErrorHandler(onFail)
    )
}

export function initConfig( fairCopyConfig, projectID, serverURL, authToken, onSuccess, onFail) {
    const initConfigURL = `${serverURL}/api/configs`

    const configObj = {
        configs: {
            project_id: projectID,
            name: configFilename,
            message: 'create initial config',        
            config_content: fairCopyConfig    
        }
    }

    axios.post(initConfigURL,configObj,authConfig(authToken)).then(
        (okResponse) => {
            const { config_content, last_action } = okResponse.data.config
            onSuccess(config_content, last_action)
        }, 
        standardErrorHandler(onFail)
    )
}

export function checkInConfig(fairCopyConfig, projectID, serverURL, authToken, onSuccess, onFail) {
    const checkInConfigURL = `${serverURL}/api/configs/${projectID}`

    const configObj = {
        configs: {
            message: 'checkin',        
            config_content: fairCopyConfig    
        }
    }

    axios.put(checkInConfigURL,configObj,authConfig(authToken)).then(
        (okResponse) => {
            const { config_content, last_action } = okResponse.data.config
            onSuccess(config_content, last_action)
        }, 
        standardErrorHandler(onFail)
    )
}

export function checkOutConfig(projectID, serverURL, authToken, onSuccess, onFail) {
    const checkOutConfigURL = `${serverURL}/api/configs/check_out/${projectID}`

    const configObj = {
        configs: {
            message: 'checkout'
        }
    }

    axios.post(checkOutConfigURL,configObj,authConfig(authToken)).then(
        (okResponse) => {
            const { status } = okResponse.data.configs
            onSuccess(status)
        }, 
        standardErrorHandler(onFail)
    )
}