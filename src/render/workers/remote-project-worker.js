import { getResource, getResources } from "../model/cloud-api/resources"
import { getProject } from "../model/cloud-api/projects"
import { getAuthToken, authConfig } from '../model/cloud-api/auth';
import { getIDMap } from "../model/cloud-api/id-map"
import { connectCable } from "../model/cloud-api/activity-cable"
import { getConfig, initConfig, checkInConfig, checkOutConfig } from "../model/cloud-api/config"
import axios from 'axios';
import { standardErrorHandler } from '../model/cloud-api/error-handler';
const { parseStandoff } = require('./parse-standoff')

function updateIDMap(userID, serverURL, authToken, projectID, postMessage) {
    getIDMap(userID, serverURL, authToken, projectID, (idMapData) => {
        postMessage({ messageType: 'id-map-update', idMapData })
    }, (error) => {
        console.log(error)
    })
}

function updateResourceView(userID, serverURL, projectID, resourceView, authToken, postMessage) {
    if (authToken) {
        const { currentPage, rowsPerPage, nameFilter, order, orderBy, indexParentID } = resourceView
        getResources(userID, serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, nameFilter, order, orderBy, (resourceData) => {
            const { parentEntry, remoteResources, totalRows } = resourceData
            resourceView.parentEntry = parentEntry
            resourceView.totalRows = totalRows
            resourceView.loading = false
            checkForAnnotationData(serverURL, userID, authToken, remoteResources, postMessage)
            postMessage({ messageType: 'resource-view-update', resourceView, remoteResources })
        },
            (error) => {
                console.log(error)
            })
    } else {
        // user is not logged in, remote list is empty
        const emptyView = {
            indexParentID: null,
            parentEntry: null,
            currentPage: 1,
            rowsPerPage: resourceView.rowsPerPage,
            totalRows: 0,
            loading: false
        }
        postMessage({ messageType: 'resource-view-update', resourceView: emptyView, remoteResources: [] })
    }
}

function checkForAnnotationData(serverURL, userID, authToken, remoteResources, postMessage) {
    remoteResources.forEach(resource => {
        if (resource.type === 'standOff') {
            const getResourceURL = `${serverURL}/api/resources/${resource.id}`

            axios.get(getResourceURL, authConfig(authToken)).then(
                (okResponse) => {
                    const { resource } = okResponse.data
                    const { parent_resource, resource_content: content } = resource
                    const data = parseStandoff(content)
                    console.log('parent_resource: ', parent_resource)
                    postMessage({ messageType: 'parsed-annotation-data', data, parentResourceID: parent_resource.resource_guid })
                },
                standardErrorHandler(userID, serverURL, (error) => console.log(error))
            )
        }
    })
}

function updateProjectInfo(userID, serverURL, authToken, projectID, postMessage) {
    getProject(userID, projectID, serverURL, authToken, (projectInfo) => {
        postMessage({ messageType: 'project-info-update', projectInfo })
    },
        (error) => {
            console.log(error)
        })
}

function updateConfig(userID, serverURL, authToken, projectID, postMessage) {
    getConfig(userID, projectID, serverURL, authToken, (config, configLastAction) => {
        postMessage({ messageType: 'config-update', config, configLastAction })
    },
        (error) => {
            console.log(error)
        })
}

function checkInFairCopyConfig(userID, serverURL, projectID, fairCopyConfig, firstAction, authToken, postMessage) {
    const onSuccess = (config, configLastAction) => {
        postMessage({ messageType: 'config-update', config, configLastAction })
    }

    const onFail = (error) => {
        postMessage({ messageType: 'config-check-out-result', status: error })
        console.log(error)
    }

    if (firstAction) {
        initConfig(fairCopyConfig, userID, projectID, serverURL, authToken, onSuccess, onFail)
    } else {
        checkInConfig(fairCopyConfig, userID, projectID, serverURL, authToken, onSuccess, onFail)
    }
}

function checkOutFairCopyConfig(userID, serverURL, projectID, authToken, postMessage) {
    const onSuccess = (status) => {
        postMessage({ messageType: 'config-check-out-result', status })
    }

    const onFail = (error) => {
        postMessage({ messageType: 'config-check-out-result', status: error })
        console.log(error)
    }

    checkOutConfig(projectID, userID, serverURL, authToken, onSuccess, onFail)
}

function getParentResource(userID, serverURL, authToken, resourceEntry, content, xmlID, postMessage) {
    getResource(userID, serverURL, authToken, resourceEntry.parentResource, (response) => {
        const { resourceEntry: parentEntry } = response
        postMessage({ messageType: 'got-parent', resourceEntry, parentEntry, content, xmlID })
    }, (errorMessage) => {
        const parentEntry = {
            id: resourceEntry.parentResource,
            localID: '___offline___',
            name: '*OFFLINE*',
            type: 'teidoc',
            remote: true,
            parentResource: null,
            deleted: false,
            gitHeadRevision: null,
            lastAction: null
        }
        postMessage({ messageType: 'got-parent', resourceEntry, parentEntry, content, xmlID })
        console.log(errorMessage)
    })
}

const onNotification = (data, workerData, postMessage) => {
    const { userID, serverURL, projectID } = workerData
    const authToken = getAuthToken(userID, serverURL)
    const { notification_type: notification } = data

    if (notification === "resources_checked_in") {
        const { resources } = data
        updateIDMap(userID, serverURL, authToken, projectID, postMessage)
        postMessage({ messageType: 'resources-updated', resources })
    }
    // other possible notifications:
    // resources_checked_out
    // config_created
    // config_checked_out
    // config_checked_in
}

export function remoteProject(msg, workerMethods, workerData) {
    const { messageType } = msg
    const { postMessage, close } = workerMethods
    const { userID, serverURL, projectID } = workerData
    const authToken = getAuthToken(userID, serverURL)

    switch (messageType) {
        case 'open':
            updateProjectInfo(userID, serverURL, authToken, projectID, postMessage)
            updateConfig(userID, serverURL, authToken, projectID, postMessage)
            updateIDMap(userID, serverURL, authToken, projectID, postMessage)
            connectCable(projectID, serverURL, authToken, (data) => onNotification(data, workerData, postMessage))
            break
        case 'get-resource':
            {
                const { resourceID, xmlID } = msg
                getResource(userID, serverURL, authToken, resourceID, (response) => {
                    const { resourceEntry, parentEntry, content } = response
                    postMessage({ messageType: 'resource-data', resourceEntry, parentEntry, content, xmlID })
                }, (errorMessage) => {
                    console.log(errorMessage)
                })
            }
            break
        case 'get-parent':
            {
                const { resourceEntry, content, xmlID } = msg
                getParentResource(userID, serverURL, authToken, resourceEntry, content, xmlID, postMessage)
            }
            break
        case 'checkin-config':
            const { config: fairCopyConfig, firstAction } = msg
            checkInFairCopyConfig(userID, serverURL, projectID, fairCopyConfig, firstAction, authToken, postMessage)
            break
        case 'checkout-config':
            checkOutFairCopyConfig(userID, serverURL, projectID, authToken, postMessage)
            break
        case 'request-view':
            const { resourceView } = msg
            updateResourceView(userID, serverURL, projectID, resourceView, authToken, postMessage)
            break
        case 'close':
            close()
            break
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
