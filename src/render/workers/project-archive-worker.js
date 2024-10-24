import { getAuthToken } from '../model/cloud-api/auth'
import { checkInResources, checkOutResources } from '../model/cloud-api/resource-management'
import { getResourceAsync, getResourcesAsync } from "../model/cloud-api/resources"
import { serializeResource } from "../model/serialize-xml"
import { renderTEIDocument } from "../model/editioncrafter/render"

const fs = window.fairCopy.getFs()
const os = window.fairCopy.getOs()
const JSZip = window.fairCopy.getJSZip()

// EditionCrafter options
const thumbnailWidth = 124
const thumbnailHeight = 192
const baseURL = 'ec://ec'

// Worker state
let projectArchiveState = { open: false, jobQueue: [] }

function setupTempFolder() {
    const cacheFolder = `${os.tmpdir()}/faircopy/`
    if( !fs.existsSync(cacheFolder) ) fs.mkdirSync(cacheFolder)
    const zipPath = fs.mkdtempSync(cacheFolder)
    return { cacheFolder, zipPath }
}

function readUTF8(targetFilePath, zip) {
    const file = zip.file(targetFilePath)
    return file ? file.async("string") : new Promise((resolve) => resolve(null))
}
 
function writeUTF8( targetFilePath, data, zip ) {
    zip.file(targetFilePath, data)
}

function addFile( localFilePath, resourceID, zip ) {
    const buffer = fs.readFileSync(localFilePath)
    zip.file(resourceID, buffer)
}

async function checkIn( userID, serverURL, projectID, committedResources, message, zip, postMessage ) {
    const authToken = getAuthToken( userID, serverURL )

    if( authToken ) {
        const onSuccess = (results) => {
            const resourceStatus = {}
            for( const result of results ) {
               resourceStatus[result.resource_guid] = 'ok' 
            }
            postMessage({ messageType: 'check-in-results', resourceStatus, error: null })
            console.log(`Check in successful.`)
        }
    
        const onFail = (error,results) => {
            const resourceStatus = {}
            if( results ) {
                for( const result of results ) {
                    resourceStatus[result.resource_guid] = result.error
                }    
            }
            postMessage({ messageType: 'check-in-results', resourceStatus, error })
            console.log(error)
        }
    
        // add the content for each resource being added or updated
        for( const committedResource of committedResources ) {
            if( committedResource.action !== 'destroy' && committedResource.type !== 'teidoc' ) {
                committedResource.content = await readUTF8(committedResource.id, zip)
            } else {
                committedResource.content = null
            }
        }
      
        checkInResources(userID, serverURL, authToken, projectID, committedResources, message, onSuccess, onFail)    
    } else {
        postMessage({ messageType: 'check-in-results', resourceIDs: [], error: "User not logged in." })
    }
}

async function checkOut( userID, serverURL, projectID, resourceEntries, zip, postMessage ) {
    const authToken = getAuthToken( userID, serverURL )
    const resources = {}

    // create a list of resource IDs include child resources
    const resourceIDs = []
    for( const resourceEntry of resourceEntries ) {
        const { id: resourceID, type } = resourceEntry
        if( type === 'teidoc' ) {
            const resourceData = await getResourcesAsync( userID, serverURL, authToken, projectID, resourceID, 1)
            for( const resource of resourceData.remoteResources ) {
                if( resource.type !== 'header' ) resourceIDs.push(resource.id)
            }
        }
        resourceIDs.push(resourceID)
    }

    if( authToken ) {
        try {
            const resourceStates = await checkOutResources( serverURL, authToken, projectID, resourceIDs )
            
            // get the contents for each resource and add them to the project 
            for( const resourceState of resourceStates ) {
                const { resource_guid: resourceID, state } = resourceState
                const { resourceEntry, parentEntry, content } = await getResourceAsync( userID, serverURL, authToken, resourceID )

                if( state === 'success') {
                    resources[resourceEntry.id] = { state, resourceEntry, parentEntry, content }
                    writeUTF8( resourceEntry.id, content, zip )    
                } else {
                    resources[resourceID] = { state, resourceEntry }
                }
            }
            postMessage({ messageType: 'check-out-results', resources, error: null })

        } catch (e) {
            postMessage({ messageType: 'check-out-results', resources, error: e.errorMessage })
        }          
    } else {
        postMessage({ messageType: 'check-out-results', resources, error: "User not logged in." })
    }
}

async function prepareResourceExport( resourceEntry, projectData, zip ) {
    const { remote, localEntries } = projectData
    const childEntries = [], contents = {}

    if( remote ) {
        try {
            const { serverURL, userID, projectID } = projectData
            const authToken = getAuthToken( userID, serverURL )
            if( !authToken ) {
                return { error: "User not logged in." }
            }
    
            if( resourceEntry.type === 'teidoc' ) {
                // if a teidoc is local, then its children must also be local
                if( resourceEntry.local ) {
                    for( const localEntry of Object.values(localEntries) ) {
                        if( localEntry.parentResource === resourceEntry.id ) {
                            childEntries.push(localEntry)
                            contents[localEntry.id] = await readUTF8( localEntry.id, zip )
                        }
                    }
                } else {
                    const resourceData = await getResourcesAsync( userID, serverURL, authToken, projectID, resourceEntry.id, 1)
                    const { remoteResources } = resourceData

                    for( const remoteEntry of remoteResources ) {
                        const { id: resourceID } = remoteEntry
                        const localEntry = localEntries[resourceID]
                        if( localEntry ) {
                            childEntries.push(localEntry)
                            contents[resourceID] = await readUTF8( resourceID, zip )
                        } else {
                            childEntries.push(remoteEntry)
                            const remoteResource = await getResourceAsync( userID, serverURL,authToken,resourceID)
                            contents[resourceID] = remoteResource.content
                        }
                    }
                }
            } else {
                const { id: resourceID } = resourceEntry
                const localEntry = localEntries[resourceID]
                if( localEntry ) {
                    contents[resourceID] = await readUTF8( resourceID, zip )
                } else {
                    const remoteResource = await getResourceAsync( userID, serverURL,authToken,resourceID)
                    contents[resourceID] = remoteResource.content
                }
            }    
        } catch(e) {
            return { error: e.message }
        }
    } else {
        if( resourceEntry.type === 'teidoc' ) {
            for( const localEntry of Object.values(localEntries) ) {
                if( localEntry.parentResource === resourceEntry.id ) {
                    childEntries.push(localEntry)
                    contents[localEntry.id] = await readUTF8( localEntry.id, zip )
                }
            }
        } else {
            const { id: resourceID } = resourceEntry
            contents[resourceID] = await readUTF8( resourceID, zip )
        }
    }

    return { resourceEntry, childEntries, contents, error: false }
}

async function cacheResource(resourceID, fileName, cacheFolder, zip) {
    const cacheFile = `${cacheFolder}/${fileName}`
    if( !fs.existsSync(cacheFile) ) {
        const imageBuffer = await zip.file(resourceID).async('nodebuffer')
        if( !imageBuffer ) {
            console.error(`Unable to retrieve ${resourceID} from project archive.`)
            return null
        }
        fs.writeFileSync(cacheFile,imageBuffer)
    }
    return cacheFile
}

function saveArchive(startTime, zipPath, zip, callback) {
    const { projectFilePath } = projectArchiveState
    const zipFile = `${zipPath}/${startTime}.zip`

    // write to a temp file first so that zip won't get 
    // corrupted if we terminate unexpectedly
    zip
        .generateNodeStream({
            type:'nodebuffer',
            compression: "DEFLATE",
            compressionOptions: {
                level: 1
            },
            streamFiles:true
        })
        .pipe(fs.createWriteStream(zipFile))
        .on('finish', () => {
            fs.copyFileSync( zipFile, projectFilePath )
            fs.unlinkSync( zipFile )
            const finishTime = Date.now()
            console.info(`${zipFile} written in ${finishTime-startTime}ms`);
            callback()
        });
}

function exportResource(resourceData, path) {       
    const { resourceEntry } = resourceData
    const { localID } = resourceEntry
    const filePath = `${path}/${localID}.xml`
    try {
        const xml = serializeResource(resourceData)
        fs.writeFileSync(filePath,xml)    
    } catch(e) {
        // log.error(e)
    }
}

function previewResource(resourceData) {
    const teiDocXML = serializeResource(resourceData,false)
    const teiDocumentID = resourceData.resourceEntry.localID
    const renderOptions = { teiDocumentID, baseURL, thumbnailWidth, thumbnailHeight } 
    const ecData = renderTEIDocument(teiDocXML, renderOptions)
    const layers = {}
    let layerID
    const { childEntries } = resourceData
    for( const childEntry of childEntries ) {
        if( childEntry.type === 'text' || childEntry.type === 'sourceDoc') {
            const {name, localID} = childEntry
            const html = ecData.resources[localID].html
            layers[localID] = { name, html }
            // first layer found is default layerID
            if( !layerID ) layerID = localID
        }
    }
    return { layers, layerID, ecData }
}

async function openArchive(postMessage,workerData) {
    const { projectFilePath, manifestEntryName, configSettingsEntryName, idMapEntryName } = workerData

    // create the archive based on worker data
    const data = fs.readFileSync(projectFilePath)
    const zip = await JSZip.loadAsync(data)
    const { cacheFolder, zipPath } = setupTempFolder()

    const fairCopyManifestJSON = await readUTF8(manifestEntryName,zip)
    const fairCopyConfigJSON = await readUTF8(configSettingsEntryName,zip)
    const idMap = await readUTF8(idMapEntryName,zip)

    const fairCopyManifest = fairCopyManifestJSON ? JSON.parse(fairCopyManifestJSON) : null
    const fairCopyConfig = fairCopyConfigJSON ? JSON.parse(fairCopyConfigJSON) : null

    // send initial project data back to project store
    const project = { fairCopyManifest, fairCopyConfig, idMap, projectFilePath }
    postMessage({ messageType: 'project-data', project })

    const open = true
    const jobQueue = []

    return { zip, cacheFolder, zipPath, open, jobQueue, projectFilePath }
}

function postError(errorMessage,postMessage) {
    postMessage({ messageType: 'error', errorMessage })
}

const save = () => {
    // process write operations in order and one at a time.
    const processNextJob = (job) => {
        const {startTime, zipPath, zip } = job
        saveArchive(startTime, zipPath, zip, () => {  
            projectArchiveState.jobQueue.shift()
            const job = projectArchiveState.jobQueue[0]
            if( job ) processNextJob(job)
        })
    }

    const { zipPath, zip } = projectArchiveState
    const startTime = Date.now()
    const job = { startTime, zipPath, zip }
    console.log(`job starting ${startTime}`)

    if( projectArchiveState.jobQueue.length === 0 ) {
        projectArchiveState.jobQueue.push(job)
        processNextJob(job)
    } else {
        projectArchiveState.jobQueue.push(job)
    }
}

// terminate worker after all jobs are done
const closeSafely = (close) => {      
    const { jobQueue, cacheFolder } = projectArchiveState

    if( jobQueue.length > 0 ) {
        // write jobs still active, wait a moment and then try again 
        setTimeout( () => { closeSafely(close) }, 1000 )
    } else {
        // when we are done with jobs, clear cache and exit
        fs.rmSync(cacheFolder, { recursive: true, force: true })
        console.info('Exiting project archive worker thread.')
        close()
    }
}

export function projectArchive( msg, workerMethods, workerData ) {
    const { open } = projectArchiveState
    const { messageType } = msg
    const { postMessage, close } = workerMethods

    if( !open ) {
        if( messageType === 'open' ) {
            openArchive(postMessage,workerData).then((state) => {
                projectArchiveState = state
            })
        } else {
            postError("Can't perform operations when archive is closed.", postMessage)
        }
        return 
    }

    const { zip } = projectArchiveState
    
    switch( messageType ) {
        case 'read-resource':
            {
                const { resourceID, xmlID } = msg
                readUTF8(resourceID, zip).then(resource => {
                    postMessage({ messageType: 'resource-data', resourceID, xmlID, resource })
                })
            }
            break
        case 'request-index':
            {
                const { resourceID } = msg
                readUTF8(resourceID, zip).then(resource => {
                    postMessage({ messageType: 'index-resource', resourceID, resource })
                })
            }
            break
        case 'request-export':
            {
                const { resourceEntry, projectData, path } = msg
                prepareResourceExport(resourceEntry,projectData,zip).then( resourceData => {
                    exportResource(resourceData, path)
                    postMessage({ messageType: 'exported-resource', path })
                })
            }
            break    
        case 'request-preview':
            {
                const { previewData, projectData } = msg
                prepareResourceExport(previewData.resourceEntry,projectData,zip).then( resp => {
                    if( resp.error ) {
                        postMessage({ messageType: 'preview-resource', error: resp.error })
                    } else {
                        const { ecData, layers, layerID } = previewResource(resp)
                        previewData.validModes = ecData.validModes
                        previewData.layers = layers
                        previewData.layerID = previewData.layerID ? previewData.layerID : layerID
                        postMessage({ messageType: 'preview-resource', previewData, ecData })
                    }
                })
            }
            break            
        case 'write-resource':
            {
                const { resourceID, data } = msg
                writeUTF8( resourceID, data, zip )    
            }
        break
        case 'write-file':
            {
                const { fileID, data } = msg
                writeUTF8( fileID, data, zip )    
            }
        break
        case 'cache-resource':
            {
                const { cacheFolder } = projectArchiveState
                const { resourceID, fileName } = msg
                cacheResource(resourceID, fileName, cacheFolder, zip).then( (cacheFile) => {
                    postMessage({ messageType: 'cache-file-name', cacheFile })
                })
            }
            break
        case 'add-local-file':
            {
                const { localFilePath, resourceID } = msg
                addFile( localFilePath, resourceID, zip )    
            }
            break   
        case 'remove-file':
            {
                const { fileID } = msg
                zip.remove(fileID)
            }
            break                   
        case 'check-in': 
            {
                const { userID, serverURL, projectID, committedResources, message } = msg
                checkIn( userID, serverURL, projectID, committedResources, message, zip, postMessage )
            }    
            break  
        case 'check-out': 
            {
                const { userID, serverURL, projectID, resourceEntries } = msg
                checkOut( userID, serverURL, projectID, resourceEntries, zip, postMessage )
            }    
            break              
        case 'save':
            save()
            break
        case 'close':
            projectArchiveState.open = false
            closeSafely(close)
            break    
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
