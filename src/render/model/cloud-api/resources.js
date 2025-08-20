import axios from 'axios';

import { authConfig } from './auth'
import { standardErrorHandler } from './error-handler';

const maxResourcesPerPage = 9999

export function getResources(userID, serverURL, authToken, projectID, parentEntry, currentPage, rowsPerPage, nameFilter, order, orderBy, onSuccess, onFail) {
    // get resource list using the status endpoint
    const getStatusesURL = `${serverURL}/api/resource_status/search`
    const parentID = parentEntry?.remoteID

    // set pagination params, filters
    const data = {
        per_page: rowsPerPage,
        page: currentPage || 1,
        filters: [
            { 'attribute_name': 'project_id', 'operator': 'equal', 'value': projectID },
            // in document, get only children; at project root, get only TEI docs
            parentID
                ? { 'attribute_name': 'parent_id', 'operator': 'equal', 'value': parentID }
                : { 'attribute_name': 'resource_type', 'operator': 'equal', 'value': 'teidoc' },
        ]
    }

    // optional search/sort
    if (nameFilter) {
        data.search = nameFilter
    }
    if (order && orderBy) {
        const sortBy = orderBy === 'localID' ? 'local_id' : orderBy   
        data.sort_by = sortBy
        data.sort_direction = order
    }

    axios.post(getStatusesURL, data, authConfig(authToken)).then(
        (okResponse) => {
            const { resource_statuses: resources, list } = okResponse.data
            const remoteResources = resources.map( resourceObj => createResourceEntry(resourceObj) )
            const totalRows = list.count
            const parentEntry = parentID && resources.length > 0 && resources[0].parent ? createResourceEntry( resources[0].parent ) : null
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

export async function getResourcesAsync( userID, serverURL, authToken, projectID, parentEntry, currentPage, rowsPerPage=maxResourcesPerPage, nameFilter=null, order=null, orderBy=null ) {
    return new Promise( ( resolve, reject ) => {
        getResources( userID, serverURL, authToken, projectID, parentEntry, currentPage, rowsPerPage, nameFilter, order, orderBy, (remoteResources) => {
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
    const { resource_guid: id, name, local_id: localID, parent_guid: parentResource, resource_type: type, git_head_revision: gitHeadRevision, last_action: lastAction, id: remoteID, is_draft, is_published } = resourceData
    return {
        id, name, localID, parentResource, type, gitHeadRevision, lastAction, remoteID,
        status: { is_draft, is_published },
        local: false,
        deleted: false
    }   
}
