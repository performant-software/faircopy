import axios from 'axios';

import { authConfig } from './auth'

const maxResourcesPerPage = 9999

export function getResources(serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, onSuccess, onFail) {
    const parentQ = indexParentID ? `/${indexParentID}` : '/null'
    const getProjectsURL = `${serverURL}/api/resources/by_project_by_parent/${projectID}${parentQ}`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resources } = okResponse.data
            const remoteResources = resources.map( resourceObj => createResourceEntry(resourceObj) )
            const parentEntry = indexParentID !== null && resources.length > 0 ? createResourceEntry( resources[0].parent_resource ) : null
            onSuccess({ parentEntry, remoteResources })
        },
        (errorResponse) => {
            if( errorResponse && errorResponse.response ) {
                if( errorResponse.response.status === 401 ) {
                    const { error } = errorResponse.response.data
                    onFail(error)        
                }
            } else {
                onFail("Unable to connect to server.")
            }
        }
    )
}

export function getResource(serverURL, authToken, resourceID, onSuccess, onFail) {
    const getResourceURL = `${serverURL}/api/resources/${resourceID}`

    axios.get(getResourceURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resource } = okResponse.data
            const { parent_entry, resource_content: content } = resource             
            const resourceEntry = createResourceEntry(resource)
            const parentEntry = parent_entry ? createResourceEntry(parent_entry) : null
            onSuccess({resourceEntry,parentEntry,content})
        },
        (errorResponse) => {
            if( errorResponse && errorResponse.response ) {
                if( errorResponse.response.status === 401 ) {
                    const { error } = errorResponse.response.data
                    onFail(error)        
                }
            } else {
                onFail("Unable to connect to server.")
            }
        }
    )
}

export async function getResourcesAsync(serverURL, authToken, projectID, resourceID, currentPage, rowsPerPage=maxResourcesPerPage ) {
    return new Promise( ( resolve, reject ) => {
        getResources( serverURL, authToken, projectID, resourceID, currentPage, rowsPerPage, (remoteResources) => {
            resolve(remoteResources)
        }, (errorMessage) => {
            reject(new Error(errorMessage))
        })    
    })
}

export async function getResourceAsync(serverURL, authToken, resourceID) {
    return new Promise( ( resolve, reject ) => {
        getResource( serverURL, authToken, resourceID, (remoteResource) => {
            resolve(remoteResource)
        }, (errorMessage) => {
            reject(new Error(errorMessage))
        })    
    })
}

function createResourceEntry(resourceData) { 
    const { resource_guid: id, name, local_id: localID, parent_guid: parentResource, resource_type: type, git_head_revision: gitHeadRevision, last_action: lastAction } = resourceData
    return {
        id, name, localID, parentResource, type, gitHeadRevision, lastAction,
        local: false,
        deleted: false
    }   
}