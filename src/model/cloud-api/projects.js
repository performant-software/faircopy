import axios from 'axios';

import { authConfig } from './auth'

export function getProjects(serverURL, authToken, onSuccess, onFail) {
    const getProjectsURL = `${serverURL}/api/projects`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { projects } = okResponse.data
            onSuccess(projects)
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
