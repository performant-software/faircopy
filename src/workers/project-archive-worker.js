import JSZip from 'jszip'
import debounce from 'debounce'

const zipWriteDelay = 6000

const fairCopy = window.fairCopy

// Worker state
let projectArchiveState = { open: false }

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

function saveArchive(jobNumber, zipPath, zip, callback) {
    const fs = fairCopy.services.getFs()
    const { projectFilePath } = projectArchiveState
    const zipFile = `${zipPath}/${jobNumber}.zip`

    const startTime = Date.now()

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
    const jobsInProgress = 0

    return { zip, cacheFolder, zipPath, open, jobsInProgress, projectFilePath }
}

function postError(errorMessage,postMessage) {
    postMessage({ messageType: 'error', errorMessage })
}

// create a debounced function for writing the ZIP
const save = debounce(() => {
    const { zipPath, zip } = projectArchiveState
    const jobNumber = Date.now()
    projectArchiveState.jobsInProgress++
    saveArchive(jobNumber, zipPath, zip, () => { projectArchiveState.jobsInProgress-- })
},zipWriteDelay)

// terminate worker after all jobs are done
const closeSafely = () => {      
    const fs = fairCopy.services.getFs()
    const { jobsInProgress, cacheFolder } = projectArchiveState

    if( jobsInProgress > 0 ) {
        // write jobs still active, wait a moment and then try again 
        setTimeout( () => { closeSafely() }, zipWriteDelay*2 )
    } else {
        // when we are done with jobs, clear cache and exit
        fs.rmSync(cacheFolder, { recursive: true, force: true })
        console.info('Exiting project archive worker thread.')
        process.exit()
    }
}

export function projectArchive( msg, postMessage, workerData ) {
    const { open } = projectArchiveState
    const { messageType } = msg

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
        case 'read-index':
            {
                const { resourceID } = msg
                const indexID = `${resourceID}.index`
                readUTF8(indexID, zip).then( index => {
                    postMessage({ messageType: 'index-data', resourceID, index })
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
        case 'write-index':
            {
                const { resourceID, data } = msg
                const indexID = `${resourceID}.index`
                writeUTF8( indexID, data, zip )    
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
        case 'save':
            save()
            break
        case 'close':
            projectArchiveState.open = false
            closeSafely()
            break    
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
