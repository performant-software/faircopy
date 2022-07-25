import { getResource, getResources } from "../model/cloud-api/resources"
import { getAuthToken } from '../model/cloud-api/auth'
import { getIDMap } from "../model/cloud-api/id-map"
import { connectCable } from "../model/cloud-api/activity-cable"

const initResourceViewState = { 
    indexParentID: null,
    parentEntry: null,
    currentPage: 1, 
    rowsPerPage: 100,
    totalRows: null,
    loading: true
}

function updateIDMap( serverURL, authToken, projectID, postMessage) {
    getIDMap(serverURL, authToken, projectID, (idMapData) => {
        postMessage({ messageType: 'id-map-update', idMapData })
    }, (error) => {
        throw new Error(error)
    })
}

function updateResourceView( serverURL, projectID, resourceView, authToken, postMessage ) {
    if( authToken ) {
        const { currentPage, rowsPerPage, indexParentID } = resourceView
        getResources( serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, (resourceData) => {
            const { parentEntry, remoteResources, totalRows } = resourceData
            resourceView.parentEntry = parentEntry
            resourceView.totalRows = totalRows
            resourceView.loading = false
            postMessage({ messageType: 'resource-view-update', resourceView, remoteResources })
        }, 
        (error) => {
            console.log(error)
        })                 
    } else {
        throw new Error(`Recieved request-view message when user is not logged in.`)
    }
}

function updateConfig() {
    // TODO
}

const onNotification = (data, workerData, postMessage) => {
    const { email, serverURL, projectID } = workerData
    const authToken = getAuthToken(email, serverURL)
    const { notification_type: notification } = data

    if( notification === "resources_checked_in"  ) {
        const { resources } = data
        updateIDMap( serverURL, authToken, projectID, postMessage )       
        postMessage({ messageType: 'resources-updated', resources })
    }
    // other possible notifications:
    // resources_checked_out
    // config_created
    // config_checked_out
    // config_checked_in
}

export function remoteProject( msg, workerMethods, workerData ) {
    const { messageType } = msg
    const { postMessage, close } = workerMethods
    const { email, serverURL, projectID } = workerData
    const authToken = getAuthToken(email, serverURL)
    
    switch( messageType ) {
        case 'open':
            updateConfig()
            updateIDMap( serverURL, authToken, projectID, postMessage )
            updateResourceView( serverURL, projectID, initResourceViewState, authToken, postMessage )
            connectCable(projectID, serverURL, authToken, (data) => onNotification( data, workerData, postMessage ) )
            break
        case 'get-resource':
            if( authToken ) {
                const { resourceID, xmlID } = msg              
                getResource(serverURL, authToken, resourceID, (response) => {
                    const { resourceEntry, parentEntry, content } = response
                    postMessage({ messageType: 'resource-data', resourceEntry, parentEntry, content, xmlID })
                }, (errorMessage) => {
                    // TODO handle errors
                })    
            } else {
                throw new Error(`Recieved get-resource message when user is not logged in.`)
            }
            break
        case 'get-parent':
            if( authToken ) {
                const { resourceEntry, content, xmlID } = msg 
                getResource(serverURL, authToken, resourceEntry.parentResource, (response) => {
                    const { resourceEntry: parentEntry } = response
                    postMessage({ messageType: 'got-parent', resourceEntry, parentEntry, content, xmlID })
                }, (errorMessage) => {
                    // TODO handle errors
                })
            } else {
                throw new Error(`Recieved get-parent message when user is not logged in.`)
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
