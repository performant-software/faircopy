import axios from 'axios';

import { authConfig } from './auth'

export function checkInResources(serverURL, authToken, projectID, resources, message, onSuccess, onFail) {
   
    const resourceObjs = resources.map( (resource) => {
        const { id, action, localID, parentID, resourceType, content } = resource
        return {
            resource_guid: id,        
            action,
            local_id: localID,
            parent_id: parentID,
            resource_type: resourceType,
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
            const { status, resource_state } = okResponse.data
            if( status === 'success' ) {
                onSuccess({ resourceState: resource_state })
            } else {
                onFail('Failed to commit resources.')
            }
        },
        (errorResponse) => {
            // problem with the license 
            if( errorResponse && errorResponse.response ) {
                if( errorResponse.response.status === 500 ) {
                    const { error } = errorResponse.response.data
                    onFail(error)        
                }
            } else {
                onFail("Unable to connect to server.")
            }
        }
    )
}
