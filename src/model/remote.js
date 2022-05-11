import { getResources } from "./cloud-api/resources"
import { getAuthToken } from "./cloud-api/auth"

export function checkForUpdates( fairCopyProject, currentPage, rowsPerPage ) {
    const { serverURL, email, projectID, resources } = fairCopyProject
    const authToken = getAuthToken( email, serverURL )
    getResources( serverURL, authToken, projectID, currentPage, rowsPerPage, (remoteResources) => {
        for( const remoteResource of remoteResources ) {
            const { resource_guid: id, local_id: localID, parent_id: parentID, resource_type: type, git_head_revision: gitHeadRevision, last_action: lastAction } = remoteResource
            if( resources[id] ) {
                // update
            } else {
                // add 
            }
        }
    }, 
    (error) => {
        console.log(error)
    }) 
}


