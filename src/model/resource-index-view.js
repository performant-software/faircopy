import { getResources, getResource } from "./cloud-api/resources"
import { getAuthToken } from "./cloud-api/auth"
import { checkOutResources } from "./cloud-api/resource-management"

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
        const { resource_guid: id } = remoteResource
        if( !localResources[id] ) {
            nextView.push(createResourceEntry(remoteResource))    
        }
    }
    return nextView.sort((a,b) => a.name.localeCompare(b.name))
}

export function checkOut( fairCopyProject, resourceIDs, callback ) {
    const { serverURL, email, projectID } = fairCopyProject
    const authToken = getAuthToken( email, serverURL )
    checkOutResources( serverURL, authToken, projectID, resourceIDs, (resourceStates) => {
        // get the contents for each resource and add them to the project 
        let n=0
        for( const resourceState of resourceStates ) {
            const { resource_guid: resourceID, state } = resourceState
            if( state === 'success') {
                // TODO set state of these entries to downloading=true
                getResource(serverURL, authToken, resourceID, (resource) => {
                    const { resource_content: content } = resource
                    const resourceEntry = createResourceEntry(resource)
                    fairCopyProject.addResource( resourceEntry, content, null )
                })
                n++
            }
        }
        const message = n > 0 ? `Checking out ${n} resources...` : 'Unable to checkout selected resources.'
        callback(message)

    }, callback)
}

function createResourceEntry(resourceData) { 
    const { resource_guid: id, name, local_id: localID, parent_id: parentID, resource_type: type, git_head_revision: gitHeadRevision, last_action: lastAction } = resourceData
    return {
        id, name, localID, parentID, type, gitHeadRevision, lastAction,
        local: false,
        downloading: false,
        deleted: false
    }   
}