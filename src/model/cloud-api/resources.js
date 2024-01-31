import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

const maxResourcesPerPage = 9999

export function getResources(userID, serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, nameFilter, order, orderBy, onSuccess, onFail) {
    const parentQ = indexParentID ? `/${indexParentID}` : '/null'
    const nameFilterQ = nameFilter ? `&search=${nameFilter}` : ''
    const currentPageQ = currentPage ? `&page=${currentPage}` : '&page=1'
    const rowsPerPageQ = `per_page=${rowsPerPage}`   
    const sortBy = orderBy === 'localID' ? 'local_id' : orderBy   
    const sortByQ = `&sort_by=${sortBy}`
    const sortDirectionQ = `&sort_direction=${order}` 
    const getProjectsURL = `${serverURL}/api/resources/by_project_by_parent/${projectID}${parentQ}?${rowsPerPageQ}${currentPageQ}${nameFilterQ}${sortByQ}${sortDirectionQ}`

    axios.get(getProjectsURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resources, list } = okResponse.data
            const remoteResources = resources.map( resourceObj => createResourceEntry(resourceObj) )
            const totalRows = list.count
            const parentEntry = indexParentID !== null && resources.length > 0 ? createResourceEntry( resources[0].parent_resource ) : null
            onSuccess({ parentEntry, totalRows, remoteResources })
        },
        standardErrorHandler(userID, serverURL, onFail)
    )
}

export function getResource( userID, serverURL, authToken, resourceID, onSuccess, onFail) {
    const getResourceURL = `${serverURL}/api/resources/${resourceID}`

    axios.get(getResourceURL,authConfig(authToken)).then(
        (okResponse) => {
            const { resource } = okResponse.data
            const { parent_resource, resource_content: content } = resource             
            const resourceEntry = createResourceEntry(resource)
            const parentEntry = parent_resource ? createResourceEntry(parent_resource) : null
            onSuccess({resourceEntry,parentEntry,content})
        },
        standardErrorHandler( userID, serverURL, onFail)
    )
}

export async function getResourcesAsync( userID, serverURL, authToken, projectID, resourceID, currentPage, rowsPerPage=maxResourcesPerPage, nameFilter=null ) {
    return new Promise( ( resolve, reject ) => {
        getResources( userID, serverURL, authToken, projectID, resourceID, currentPage, rowsPerPage, nameFilter, (remoteResources) => {
            resolve(remoteResources)
        }, (errorMessage) => {
            reject(new Error(errorMessage))
        })    
    })
}

export async function getResourceAsync( userID, serverURL, authToken, resourceID) {
    return new Promise( ( resolve, reject ) => {
        getResource( userID, serverURL, authToken, resourceID, (remoteResource) => {
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