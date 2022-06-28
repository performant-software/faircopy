import axios from 'axios';

import { authConfig } from './auth'

export function getResources(serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, onSuccess, onFail) {
    const getProjectsURL = `${serverURL}/api/resources/by_project/${projectID}`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resources } = okResponse.data
            onSuccess(resources)
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

export function getResource(serverURL, authToken, resourceID, onSuccess, onFail) {
    const getResourceURL = `${serverURL}/api/resources/${resourceID}`

    axios.get(getResourceURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resource } = okResponse.data
            onSuccess(resource)
        },
        (errorResponse) => {
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