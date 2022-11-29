import { getResource, getResources } from "../model/cloud-api/resources"
import { getProject } from "../model/cloud-api/projects"
import { getAuthToken } from '../model/cloud-api/auth'
import { getIDMap } from "../model/cloud-api/id-map"
import { connectCable } from "../model/cloud-api/activity-cable"
import { getConfig, initConfig, checkInConfig, checkOutConfig } from "../model/cloud-api/config"

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

function updateProjectInfo( userID, serverURL, authToken, projectID, postMessage) {
    getProject(userID, projectID, serverURL, authToken, (projectInfo) => {
        postMessage({ messageType: 'project-info-update', projectInfo })
    },
    (error) => {
       console.log(error)
    })
}

function updateConfig( serverURL, authToken, projectID, postMessage ) {
    getConfig(projectID, serverURL, authToken, (config, configLastAction) => {
        postMessage({ messageType: 'config-update', config, configLastAction })
    },
    (error) => {
       console.log(error)
    })
}

function checkInFairCopyConfig( serverURL, projectID, fairCopyConfig, firstAction, authToken, postMessage ) {
    const onSuccess = (config, configLastAction) => {
        postMessage({ messageType: 'config-update', config, configLastAction })
    }

    const onFail = (error) => {
        console.log(error)
    }

    if( firstAction ) {
        initConfig( fairCopyConfig, projectID, serverURL, authToken, onSuccess, onFail )
    } else {
        checkInConfig( fairCopyConfig, projectID, serverURL, authToken, onSuccess, onFail ) 
    }
}

function checkOutFairCopyConfig( serverURL, projectID, authToken ) {
    const onSuccess = (status) => {
        console.log(status)
    }

    const onFail = (error) => {
        console.log(error)
    }

    checkOutConfig( projectID, serverURL, authToken, onSuccess, onFail ) 
}

const onNotification = (data, workerData, postMessage) => {
    const { userID, serverURL, projectID } = workerData
    const authToken = getAuthToken(userID, serverURL)
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
    const { userID, serverURL, projectID } = workerData
    const authToken = getAuthToken(userID, serverURL)
    
    switch( messageType ) {
        case 'open':
            // timeout is just for debugging
            setTimeout( () => {
                updateProjectInfo(userID, serverURL, authToken, projectID, postMessage)
                updateConfig( serverURL, authToken, projectID, postMessage )
                updateIDMap( serverURL, authToken, projectID, postMessage )
                connectCable(projectID, serverURL, authToken, (data) => onNotification( data, workerData, postMessage ) )    
            }, 2000)
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
        case 'checkin-config':
            const { config:fairCopyConfig, firstAction } = msg 
            checkInFairCopyConfig( serverURL, projectID, fairCopyConfig, firstAction, authToken, postMessage )
            break
        case 'checkout-config':
            checkOutFairCopyConfig( serverURL, projectID, authToken )
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
