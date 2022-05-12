import { getResources } from "./cloud-api/resources"
import { getAuthToken } from "./cloud-api/auth"

export function checkForUpdates( fairCopyProject, teiDoc, currentPage, rowsPerPage, onUpdate, onError ) {
    const { serverURL, email, projectID, resources } = fairCopyProject
    const authToken = getAuthToken( email, serverURL )
    getResources( serverURL, authToken, projectID, currentPage, rowsPerPage, (remoteResources) => {
        fairCopyProject.resourceIndexView = createResourceIndexView( teiDoc, resources, remoteResources )
        onUpdate()
    }, 
    (error) => {
        onError(error)
    }) 
}

export function createResourceIndexView( teiDoc, localResources, remoteResources ) {
    const nextView = [ ...Object.values(localResources) ]
    for( const remoteResource of remoteResources ) {
        const { resource_guid: id, local_id: localID, parent_id: parentID, resource_type: type, git_head_revision: gitHeadRevision, last_action: lastAction } = remoteResource
        if( !localResources[id] ) {
            nextView.push({
                id, localID, parentID, type, gitHeadRevision, lastAction,
                local: false,
                downloading: false
            })    
        }
    }
    return nextView
}

