import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

export function getProjects( userID, serverURL, authToken, onSuccess, onFail) {
    const getProjectsURL = `${serverURL}/api/projects`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { projects } = okResponse.data
            const projectInfos = []
            for( const project of projects ) {
                const projectInfo = createProjectInfo(userID, project)  
                projectInfos.push(projectInfo)              
            }
            onSuccess(projectInfos)
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}

export function getProject( userID, projectID, serverURL, authToken, onSuccess, onFail) {
    const getProjectURL = `${serverURL}/api/projects/${projectID}`

    axios.get(getProjectURL,authConfig(authToken)).then(
        (okResponse) => {
            const { project } = okResponse.data
            const projectInfo = createProjectInfo(userID, project)
            onSuccess(projectInfo)
        }, 
        standardErrorHandler(userID, serverURL, onFail)
    )
}

function createProjectInfo(userID, project) {
    const { id, name, description, team } = project

    // pull out just english strings for now
    const enName = name.en.translation
    const enDescription = description.en.translation
    const projectInfo = { projectID: id, name: enName, description: enDescription, permissions: [] }

    // translate into an array of permissions for current user
    const { team_members } = team 
    const teamMember = team_members.find( t => t.user.id === userID )
    if( teamMember ) {
        const { user, team_member_policies } = teamMember
        const { user_policies } = user
        const policies = [ ...team_member_policies, ...user_policies ]
        const permissionMap = {}
        for( const policy of policies ) {
            const { name: permission } = policy.policy_definition
            permissionMap[permission] = true
        }
        projectInfo.permissions = Object.keys(permissionMap)
    }
    return projectInfo
}