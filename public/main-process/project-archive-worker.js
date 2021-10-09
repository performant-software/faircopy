const { workerData, parentPort } = require('worker_threads')
const JSZip = require('jszip')
const fs = require('fs')
const os = require('os')
const log = require('electron-log')
const debounce = require('debounce')
const { manifestEntryName, configSettingsEntryName, idMapEntryName } = require('./ProjectStore')

const zipWriteDelay = 6000


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

async function cacheResource(resourceID, fileName, cacheFolder, zip) {
    const cacheFile = `${cacheFolder}/${fileName}`
    if( !fs.existsSync(cacheFile) ) {
        const imageBuffer = await zip.file(resourceID).async('nodebuffer')
        if( !imageBuffer ) {
            log.error(`Unable to retrieve ${resourceID} from project archive.`)
            return null
        }
        fs.writeFileSync(cacheFile,imageBuffer)
    }
    return cacheFile
}

function saveArchive(jobNumber, zipPath, zip, callback) {
    const { projectFilePath } = workerData
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
            log.info(`${zipFile} written in ${finishTime-startTime}ms`);
            callback()
        });
}

async function openArchive() {
    const { projectFilePath } = workerData

    // create the archive based on worker data
    const data = fs.readFileSync(projectFilePath)
    const zip = await JSZip.loadAsync(data)
    const { cacheFolder, zipPath } = setupTempFolder()

    const fairCopyManifest = await readUTF8(manifestEntryName,zip)
    let fairCopyConfig = await readUTF8(configSettingsEntryName,zip)
    const idMap = await readUTF8(idMapEntryName,zip)

    // send initial project data back to project store
    const project = { fairCopyManifest, fairCopyConfig, idMap, projectFilePath }
    parentPort.postMessage({ messageType: 'project-data', project })

    return { zip, cacheFolder, zipPath }
}

function postError(errorMessage) {
    parentPort.postMessage({ messageType: 'error', errorMessage })
}

async function run() {
    const { zip, cacheFolder, zipPath } = await openArchive()
    let open = true
    let jobsInProgress = 0

    // create a debounced function for writing the ZIP
    const save = debounce(() => {
        const jobNumber = Date.now()
        jobsInProgress++
        saveArchive(jobNumber, zipPath, zip, () => { jobsInProgress-- })
    },zipWriteDelay)

    // terminate worker after all jobs are done
    const closeSafely = () => {        
        if( jobsInProgress > 0 ) {
            // write jobs still active, wait a moment and then try again 
            setTimeout( () => { closeSafely() }, zipWriteDelay*2 )
        } else {
            // when we are done with jobs, clear cache and exit
            fs.rmSync(cacheFolder, { recursive: true, force: true })
            log.info('Exiting project archive worker thread.')
            process.exit()
        }
    }
    
    parentPort.on('message', (msg) => {
        const { messageType } = msg

        if( !open ) {
            postError("Can't perform operations after archive is closed.")
            return
        }

        switch( messageType ) {
            case 'read-resource':
                {
                    const { resourceID } = msg
                    readUTF8(resourceID, zip).then(resource => {
                        parentPort.postMessage({ messageType: 'resource-data', resourceID, resource })
                    })
                }
                break
            case 'read-index':
                {
                    const { resourceID } = msg
                    const indexID = `${resourceID}.index`
                    readUTF8(indexID, zip).then( index => {
                        parentPort.postMessage({ messageType: 'index-data', resourceID, index })
                    })
                }
                break
            case 'open-image-view':
                {
                    const { imageViewData, resourceID } = msg
                    readUTF8(resourceID, zip).then( (resource) => {
                        imageViewData.resource = resource
                        parentPort.postMessage({ messageType: 'image-view-ready', resourceID, imageViewData })
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
                    const { resourceID, fileName } = msg
                    cacheResource(resourceID, fileName, cacheFolder, zip).then( (cacheFile) => {
                        parentPort.postMessage({ messageType: 'cache-file-name', cacheFile })
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
                open = false
                closeSafely()
                break    
            default:
                throw new Error(`Unrecognized message type: ${messageType}`)
        }
    })
}

// RUN THREAD /////////////////
run().then(() => {
    log.info('Project archive worker started.')
}, (err) => {
    postError(`Project archive worker failed to start: ${err}: ${err.stack}`)
    process.exit()
})