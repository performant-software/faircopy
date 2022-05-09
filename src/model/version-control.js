import { getAuthToken } from '../model/cloud-api/auth'
import { checkInResources } from '../model/cloud-api/resource-management'

export function checkIn( fairCopyProject, committedResources, message, onSuccess, onFail ) {
    const { email, serverURL, projectID } = fairCopyProject
    const authToken = getAuthToken( email, serverURL )

    const committedResourcesWithContent = committedResources.map( (committedResource) => {
        // TODO add the content of each resource to the object
        return committedResource
    })
  
    checkInResources(serverURL, authToken, projectID, committedResourcesWithContent, message, onSuccess, onFail)
}
