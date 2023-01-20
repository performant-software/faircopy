import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

export function getIDMap(serverURL, authToken, projectID, onSuccess, onFail) {
    const getIDMapURL = `${serverURL}/api/id_map/${projectID}`

    axios.get(getIDMapURL,authConfig(authToken)).then(
        (okResponse) => {
            const { id_map } = okResponse.data
            onSuccess(id_map)
        },
        standardErrorHandler(onFail)
    )
}