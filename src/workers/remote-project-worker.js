import { getResource } from "../model/cloud-api/resources"
import { getAuthToken } from '../model/cloud-api/auth'
import { getIDMap } from "../model/cloud-api/id-map"

const pollingInterval = 3000 // ms

function updateIDMap( serverURL, authToken, projectID, postMessage) {
    getIDMap(serverURL, authToken, projectID, (idMapData) => {
        postMessage({ messageType: 'id-map-update', idMapData })
    }, (error) => {
        throw new Error(error)
    })
}

function updateConfig() {
    // TODO
}

export function remoteProject( msg, workerMethods, workerData ) {
    const { messageType } = msg
    const { postMessage, close } = workerMethods
    const { email, serverURL, projectID } = workerData
    const authToken = getAuthToken(email, serverURL)

    const pingResources = () => {
        postMessage({ messageType: 'resource-update' })
        updateIDMap( serverURL, authToken, projectID, postMessage )
        updateConfig()
    }    
    
    switch( messageType ) {
        case 'open':
            setInterval( pingResources, pollingInterval )
            break
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
            clearInterval( pingResources )
            close()
            break            
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
