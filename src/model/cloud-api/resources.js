import axios from 'axios';

import { authConfig } from './auth'

export function getResources(serverURL, authToken, projectID, currentPage, rowsPerPage, onSuccess, onFail) {
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
