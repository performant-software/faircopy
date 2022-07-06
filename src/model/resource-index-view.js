import { getResource } from "./cloud-api/resources"
import { getAuthToken } from "./cloud-api/auth"
import { checkOutResources } from "./cloud-api/resource-management"

export function checkOut( fairCopyProject, resourceIDs, callback ) {
    const { serverURL, email, projectID, idMap } = fairCopyProject
    const authToken = getAuthToken( email, serverURL )
    checkOutResources( serverURL, authToken, projectID, resourceIDs, (resourceStates) => {
        // get the contents for each resource and add them to the project 
        let n=0
        for( const resourceState of resourceStates ) {
            const { resource_guid: resourceID, state } = resourceState
            if( state === 'success') {
                getResource(serverURL, authToken, resourceID, (resourceEntry,parentEntry,content) => {
                    const idMapEntry = idMap.getMapEntry(resourceEntry.localID)
                    fairCopyProject.addResource( resourceEntry, content, idMapEntry )
                })
                n++
            }
        }
        const message = n > 0 ? `Checking out ${n} resources...` : 'Unable to checkout selected resources.'
        callback(message)

    }, callback)
}

