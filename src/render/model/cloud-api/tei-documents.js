import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

export function getTeiDocument(userID, serverURL, authToken, projectID, localID, onSuccess, onFail) {
    const getURL = `${serverURL}/api/tei_documents/${projectID}/${localID}`

    axios.get(getURL, authConfig(authToken)).then(
        (okResponse) => {
            const { tei_document } = okResponse.data
            onSuccess(tei_document)
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}


export function publishTeiDocument(userID, serverURL, authToken, projectID, localID, onSuccess, onFail) {
    const publishURL = `${serverURL}/api/tei_documents/publish/${projectID}/${localID}`

    axios.post(publishURL, {}, authConfig(authToken)).then(
        (okResponse) => {
            const { tei_document } = okResponse.data
            onSuccess(tei_document)
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}
