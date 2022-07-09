import { getResource, getResources } from "../model/cloud-api/resources"
import { getAuthToken } from '../model/cloud-api/auth'
import { getIDMap } from "../model/cloud-api/id-map"

const initResourceViewState = { 
    indexParentID: null,
    currentPage: 0, 
    rowsPerPage: 100
}

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

function updateResourceView( serverURL, projectID, resourceView, authToken, postMessage ) {
    if( authToken ) {
        const { currentPage, rowsPerPage, indexParentID } = resourceView
        getResources( serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, (remoteResources) => {
            postMessage({ messageType: 'resource-view-update', resourceView, remoteResources })
        }, 
        (error) => {
            console.log(error)
        })                 
    } else {
        throw new Error(`Recieved request-view message when user is not logged in.`)
    }
}

export function remoteProject( msg, workerMethods, workerData ) {
    const { messageType } = msg
    const { postMessage, close } = workerMethods
    const { email, serverURL, projectID } = workerData
    const authToken = getAuthToken(email, serverURL)
    
    switch( messageType ) {
        case 'open':
            // updateIDMap( serverURL, authToken, projectID, postMessage )
            // updateConfig()
            updateResourceView( serverURL, projectID, initResourceViewState, authToken, postMessage )
            break
        case 'get-resource':
            if( authToken ) {
                const { resourceID } = msg              
                getResource(serverURL, authToken, resourceID, (response) => {
                    const { resourceEntry, parentEntry, content } = response
                    postMessage({ messageType: 'resource-data', resourceEntry, parentEntry, content })
                }, (errorMessage) => {
                    // TODO handle errors
                })    
            } else {
                throw new Error(`Recieved get-resource message when user is not logged in.`)
            }
            break
        case 'request-view':
            const { resourceView } = msg     
            updateResourceView( serverURL, projectID, resourceView, authToken, postMessage )
            break
        case 'close':
            close()
            break            
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
