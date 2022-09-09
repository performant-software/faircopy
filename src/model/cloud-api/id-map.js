import axios from 'axios';

import { authConfig } from './auth'

export function getIDMap(serverURL, authToken, projectID, onSuccess, onFail) {
    const getIDMapURL = `${serverURL}/api/id_map/${projectID}`

    axios.get(getIDMapURL,authConfig(authToken)).then(
        (okResponse) => {
            const { id_map } = okResponse.data
            onSuccess(id_map)
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