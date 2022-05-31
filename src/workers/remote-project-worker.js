import { getResource } from "../model/cloud-api/resources"
import { getAuthToken } from '../model/cloud-api/auth'

export function remoteProject( msg, workerMethods, workerData ) {
    const { messageType } = msg
    const { postMessage, close } = workerMethods
    const { email, serverURL } = workerData
    const authToken = getAuthToken(email, serverURL)
    
    switch( messageType ) {
        case 'get-resource':
                if( authToken ) {
                    const { resourceID } = msg              
                    getResource(serverURL, authToken, resourceID, (resource) => {
                        const { resource_content } = resource
                        postMessage({ messageType: 'resource-data', resourceID, resource: resource_content })
                    })    
                } else {
                    throw new Error(`Recieved get-resource message when user is not logged in.`)
                }
            break
        case 'close':
            close()
            break            
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
