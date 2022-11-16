import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

export function getProjects(serverURL, authToken, onSuccess, onFail) {
    const getProjectsURL = `${serverURL}/api/projects`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { projects } = okResponse.data
            onSuccess(projects)
        },
        standardErrorHandler(onFail)
    )
}

export function getProject(projectID, serverURL, authToken, onSuccess, onFail) {
    const getProjectURL = `${serverURL}/api/projects/${projectID}`

    axios.get(getProjectURL,authConfig(authToken)).then(
        (okResponse) => {
            const { project } = okResponse.data
            onSuccess(project)
        }, 
        standardErrorHandler(onFail)
    )
}