import JSZip from 'jszip'
import { getAuthToken } from '../model/cloud-api/auth'
import { checkInResources } from '../model/cloud-api/resource-management'

const fairCopy = window.fairCopy

// Worker state
let projectArchiveState = { open: false, jobQueue: [] }

function setupTempFolder() {
    const os = fairCopy.services.getOs()
    const fs = fairCopy.services.getFs()

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
    const fs = fairCopy.services.getFs()
    const buffer = fs.readFileSync(localFilePath)
    zip.file(resourceID, buffer)
}

async function checkIn( email, serverURL, projectID, committedResources, message, zip, postMessage ) {
    const authToken = getAuthToken( email, serverURL )

    const onSuccess = (results) => {
        postMessage({ messageType: 'check-in-results', results })
    }

    const onFail = (error) => {
        postMessage({ messageType: 'check-in-error', error })
    }

    if( authToken ) {
        // add the content for each resource being added or updated
        for( const committedResource of committedResources ) {
            if( committedResource.action !== 'destroy' ) {
                // TODO handle tei docs and images
                committedResource.content = await readUTF8(committedResource.id, zip)
            }
        }
      
        checkInResources(serverURL, authToken, projectID, committedResources, message, onSuccess, onFail)    
    } else {
        postMessage({ messageType: 'check-in-error', error: "User not logged in." })
    }
}

async function prepareResourceExport( resourceEntry, zip ) {
    const resourceData = {}

    if( resourceEntry.type === 'teidoc' ) {
        for( const resourceID of resourceEntry.resources ) {
            resourceData[resourceID] = await readUTF8( resourceID, zip )
        }    
    } else {
        resourceData[resourceEntry.id] = await readUTF8( resourceEntry.id, zip )
    }

    return resourceData
}

async function cacheResource(resourceID, fileName, cacheFolder, zip) {
    const fs = fairCopy.services.getFs()

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
    const fs = fairCopy.services.getFs()
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

async function openArchive(postMessage,workerData) {
    const fs = fairCopy.services.getFs()
    const { projectFilePath, manifestEntryName, configSettingsEntryName, idMapEntryName } = workerData

    // create the archive based on worker data
    const data = fs.readFileSync(projectFilePath)
    const zip = await JSZip.loadAsync(data)
    const { cacheFolder, zipPath } = setupTempFolder()

    const fairCopyManifest = await readUTF8(manifestEntryName,zip)
    let fairCopyConfig = await readUTF8(configSettingsEntryName,zip)
    const idMap = await readUTF8(idMapEntryName,zip)

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
    const fs = fairCopy.services.getFs()
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
                const { resourceID } = msg
                readUTF8(resourceID, zip).then(resource => {
                    postMessage({ messageType: 'resource-data', resourceID, resource })
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
                const { resourceEntry, path } = msg
                prepareResourceExport(resourceEntry,zip).then( resourceData => {
                    postMessage({ messageType: 'export-resource', resourceID: resourceEntry.id, resourceData, path })
                })
            }
            break
        case 'open-image-view':
            {
                const { imageViewData, resourceID } = msg
                readUTF8(resourceID, zip).then( (resource) => {
                    imageViewData.resource = resource
                    postMessage({ messageType: 'image-view-ready', resourceID, imageViewData })
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
                const { email, serverURL, projectID, committedResources, message } = msg
                checkIn( email, serverURL, projectID, JSON.parse(committedResources), message, zip, postMessage )
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
