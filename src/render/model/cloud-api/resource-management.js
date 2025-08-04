import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

export function checkInResources(userID, serverURL, authToken, projectID, resources, message, onSuccess, onFail) {
   
    const resourceObjs = resources.map( (resource) => {
        const { id, name, action, localID, parentID, resourceType, resourceMap, content } = resource
        return {
            resource_guid: id,
            name,        
            action,
            local_id: localID,
            parent_guid: parentID,
            resource_type: resourceType,
            id_map_entry: resourceMap,
            resource_content: content
        }
    })

    const checkInObj = {
        check_in: {
            project_id: projectID,        
            message,
            resources: resourceObjs    
        }
    }
    
    const checkInURL = `${serverURL}/api/resource_management/check_in`

    axios.post(checkInURL,checkInObj,authConfig(authToken)).then(
        (okResponse) => {
            const { status, resource_state: resourceState } = okResponse.data
            if( status === 'success' ) {
                onSuccess(resourceState)
            } else {
                onFail("Unable to check in resources.", resourceState)
            }
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}

async function checkInResourcesAsync(userID, serverURL, authToken, projectID, resources, message) {
    return new Promise((resolve, reject) => {
        try {
            checkInResources(userID, serverURL, authToken, projectID, resources, message, (resourceState) => {
                resolve(resourceState)
            }, (errorMessage, resourceState) => {
                reject({ errorMessage, resourceState })
            })
        } catch (err) {
            // catch errors not related to the request response hitting onFail
            reject({ errorMessage: String(err), resourceState: [] });
        }
    })
}

export async function checkInResourceBatches(userID, serverURL, authToken, projectID, resourceBatches, message, onSuccess, onFail) {
    // wait until each successful async checkin has completed to check in the next batch; call onSuccess or onFail for each
    // successful or failed batch
    for (let i = 0; i < resourceBatches.length; i++) {
        const msg = i === 0 ? message : `${message} (${i})`;
        try {
            const resourceState = await checkInResourcesAsync(userID, serverURL, authToken, projectID, resourceBatches[i], msg)
            onSuccess(resourceState)
        } catch ({ errorMessage, resourceState }) {
            onFail(errorMessage, resourceState)
        }
    }
}

export function checkOutResources(serverURL, authToken, projectID, resourceIDs) {
   
    const resourceObjs = resourceIDs.map( (resourceID) => {
        return {
            resource_guid: resourceID,        
            action: 'check_out'
        }
    })

    const checkOutObj = {
        check_out: {
            project_id: projectID,        
            message: '',
            resources: resourceObjs    
        }
    }

    const checkOutURL = `${serverURL}/api/resource_management/check_out`

    return new Promise( (resolve,reject) => {
        axios.post(checkOutURL,checkOutObj,authConfig(authToken)).then(
            (okResponse) => {
                const { status, resource_state } = okResponse.data
                if( status === 'success' ) {
                    resolve(resource_state)
                } else {
                    reject('Failed to check out resources.')
                }
            },
            (errorResponse) => {
                if( errorResponse && errorResponse.message ) {
                    reject(errorResponse.message)        
                } else {
                    reject("Unable to connect to server.")
                }
            }
        )
    })
}

export function abandonCheckout(userID, serverURL, authToken, projectID, resource, onSuccess, onFail) {
    // abandon check out on a resource
    const data = { project_id: projectID, resource_guid: resource.id }

    const checkInURL = `${serverURL}/api/resource_management/abandon`
    axios.post(checkInURL, data,authConfig(authToken)).then(
        (okResponse) => {
            const { status } = okResponse.data
            if( status === 'success' ) {
                onSuccess()
            } else {
                onFail("Unable to unlock checked-out document.")
            }
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}