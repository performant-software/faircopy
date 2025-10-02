import axios from 'axios'

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler'
import { getUserOrganizations } from './auth'

export function getProjects(userID, serverURL, authToken, onSuccess, onFail) {
    const getProjectsURL = `${serverURL}/api/projects?per_page=1000`

    axios.get(getProjectsURL, authConfig(authToken)).then(
        (okResponse) => {
            const { projects } = okResponse.data
            const projectInfos = []
            for (const project of projects) {
                const projectInfo = createProjectInfo(userID, serverURL, project)
                projectInfos.push(projectInfo)
            }
            onSuccess(projectInfos)
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}

export function getProject(userID, projectID, serverURL, authToken, onSuccess, onFail) {
    const getProjectURL = `${serverURL}/api/projects/${projectID}`

    axios.get(getProjectURL, authConfig(authToken)).then(
        (okResponse) => {
            const { project } = okResponse.data
            const projectInfo = createProjectInfo(userID, serverURL, project)
            onSuccess(projectInfo)
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}

function createProjectInfo(userID, serverURL, project) {
    const { id, name, description, project_users, custom_css, organization_id, draft_custom_css } = project

    const orgs = getUserOrganizations(userID, serverURL)

    const projectInfo = {
        projectID: id,
        name: name,
        description: description,
        permissions: [],
        hasPublishedCss: !!custom_css,
        hasDraftCss: !!draft_custom_css,
    }

    // translate into an array of permissions for current user
    // System Admin?
    const sysAdmin = !!orgs.find(o => o.organization_id === 1 && o.is_admin)
    // Org Admin?
    const orgAdmin = !!orgs.find(o => o.organization_id === organization_id && o.is_admin)

    if (sysAdmin || orgAdmin) {
        projectInfo.permissions.push('FCC_OrgAdmin')
    }

    const projectUser = project_users.find(pu => pu.user.id === userID)

    if (projectUser) {
        projectInfo.permissions.push(projectUser.policy_definition.name)
    }
    return projectInfo
}

export function publishCss(userID, projectID, serverURL, authToken, onSuccess, onFail) {
    const publishCssURL = `${serverURL}/api/projects/${projectID}/publish_css`

    axios.post(publishCssURL, {}, authConfig(authToken)).then(
        (okResponse) => {
            const { project } = okResponse.data
            const projectInfo = createProjectInfo(userID, serverURL, project)
            onSuccess(projectInfo)
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}
