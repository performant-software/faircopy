import { getResource, getResources } from "../model/cloud-api/resources"
import { getProject, runAgent, publishCss } from "../model/cloud-api/projects"
import { getAuthToken } from '../model/cloud-api/auth'
import { getIDMap } from "../model/cloud-api/id-map"
import { connectCable } from "../model/cloud-api/activity-cable"
import { getConfig, initConfig, checkInConfig, checkOutConfig } from "../model/cloud-api/config"
import { getTeiDocument, publishTeiDocument } from "../model/cloud-api/tei-documents"
import { abandonCheckout } from "../model/cloud-api/resource-management"

function updateIDMap(userID, serverURL, authToken, projectID, postMessage) {
    getIDMap(userID, serverURL, authToken, projectID, (idMapData) => {
        postMessage({ messageType: 'id-map-update', idMapData })
    }, (error) => {
        console.log(error)
    })
}

function updateResourceView(userID, serverURL, projectID, resourceView, published, authToken, postMessage) {
    if (authToken) {
        const { currentPage, rowsPerPage, nameFilter, order, orderBy, parentEntry: viewParentEntry } = resourceView
        getResources(userID, serverURL, authToken, projectID, viewParentEntry, currentPage, rowsPerPage, nameFilter, order, orderBy, (resourceData) => {
            const { parentEntry, remoteResources, totalRows } = resourceData
            // ensure lastAction is preserved after retrieving remote parent entry
            resourceView.parentEntry = parentEntry ? {
                ...parentEntry,
                lastAction: parentEntry?.lastAction || resourceView.parentEntry?.lastAction
            } : parentEntry
            resourceView.totalRows = totalRows
            resourceView.loading = false
            // update resource view with remote resources
            if (parentEntry) {
                // inside a TEI document, get parent document's draft/published/processing status
                const { localID } = parentEntry
                getTeiDocument(userID, serverURL, authToken, projectID, localID, (teiDocData) => {
                    resourceView.parentEntry.status = teiDocData
                    postMessage({ messageType: 'resource-view-update', resourceView, remoteResources, published })
                },
                    (error) => console.log(error))
            } else {
                // at the remote project root, update view
                postMessage({ messageType: 'resource-view-update', resourceView, remoteResources, published })
            }
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

function onPublishTeiDocument(userID, serverURL, projectID, teiDoc, authToken, postMessage) {
    const { localID } = teiDoc
    publishTeiDocument(userID, serverURL, authToken, projectID, localID, () => {
        // refresh the current view's resources to show updated document's "published/processing" status
        postMessage({ messageType: 'resources-updated', published: true })
    },
        (error) => {
            console.log(error)
        })
}

function onPublishCss(userID, serverURL, projectID, authToken, postMessage) {
    publishCss(userID, projectID, serverURL, authToken, (projectInfo) => {
        postMessage({ messageType: 'project-info-update', projectInfo })
    },
        (error) => {
            console.log(error)
        })
}

function onRunAgent(userID, serverURL, projectID, authToken, fileContents, docID, postMessage) {
    runAgent(userID, serverURL, projectID, authToken, fileContents, (data) => {
        postMessage({ messageType: 'agent-updated', xml: data, docID })
    },
        (error) => {
            postMessage({ messageType: 'agent-failed', error })
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
    console.log(`received cable message: ${notification}`)
    
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
            const { resourceView, published } = msg
            updateResourceView(userID, serverURL, projectID, resourceView, published, authToken, postMessage)
            break
        case 'publish':
            const { teiDoc } = msg
            onPublishTeiDocument(userID, serverURL, projectID, teiDoc, authToken, postMessage)
            break
        case 'abandon':
            const { resource } = msg
            abandonCheckout(userID, serverURL, authToken, projectID, resource, () => {
                postMessage({ messageType: 'resources-updated', resources: [resource] })
            }, (errorMessage) => {
                console.log(errorMessage)
            })
            break
        case 'check-abandoned':
            {
                const { resources: localResources, resourceView } = msg
                const { currentPage, rowsPerPage, nameFilter, order, orderBy, indexParentID } = resourceView
                getResources(userID, serverURL, authToken, projectID, indexParentID, currentPage, rowsPerPage, nameFilter, order, orderBy, (resourceData) => {
                    const { remoteResources } = resourceData
                    postMessage({ messageType: 'process-abandoned', localResources, remoteResources })
                }, (errorMessage) => {
                    console.log(errorMessage)
                })
            }
            break
        case 'publish-css':
            onPublishCss(userID, serverURL, projectID, authToken, postMessage)
            break
        case 'perform-ner':
            const { fileContents, docID } = msg
            onRunAgent(userID, serverURL, projectID, authToken, fileContents, docID, postMessage)
            break
        case 'refresh-project-info':
            updateProjectInfo(userID, serverURL, authToken, projectID, postMessage)
            break
        case 'close':
            close()
            break
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
