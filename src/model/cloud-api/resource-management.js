import axios from 'axios';

import { authConfig } from './auth'

export function checkInResources(serverURL, authToken, projectID, resources, message, onSuccess, onFail) {
   
    const resourceObjs = resources.map( (resource) => {
        const { id, name, action, localID, parentID, resourceType, resourceMap, content } = resource
        return {
            resource_guid: id,
            name,        
            action,
            local_id: localID,
            parent_id: parentID,
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
                onFail('Failed to commit resources.')
            }
        },
        (errorResponse) => {
            if( errorResponse && errorResponse.message ) {
                onFail(errorResponse.message)        
            } else {
                onFail("Unable to connect to server.")
            }
        }
    )
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
                    reject('Failed to commit resources.')
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