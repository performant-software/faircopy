const { workerData, parentPort } = require('worker_threads')
const JSZip = require('jszip')
const fs = require('fs')
const os = require('os')
const log = require('electron-log')

function setupTempFolder() {
    const cacheFolder = `${os.tmpdir()}/faircopy/`
    if( !fs.existsSync(cacheFolder) ) fs.mkdirSync(cacheFolder)
    const zipPath = fs.mkdtempSync(cacheFolder)
    return { cacheFolder, zipPath }
}

function readUTF8(targetFilePath, zip) {
    const file = zip.file(targetFilePath)
    return file ? file.async("string") : null
}
 
function writeUTF8( targetFilePath, data, zip ) {
    zip.file(targetFilePath, data)
}

function addFile( localFilePath, resourceID, zip ) {
    const buffer = fs.readFileSync(localFilePath)
    zip.file(resourceID, buffer)
}

async function cacheResource(resourceID, fileName, cacheFolder, zip) {
    const imageBuffer = await zip.file(resourceID).async('nodebuffer')
    const cacheFile = `${cacheFolder}/${fileName}`
    fs.writeFileSync(cacheFile,imageBuffer)
    return cacheFile
}

function saveArchive(zipPath, zip) {
    const { projectFilePath } = workerData

    const startTime = Date.now()
    zip
        .generateNodeStream({
            type:'nodebuffer',
            compression: "DEFLATE",
            compressionOptions: {
                level: 1
            },
            streamFiles:true
        })
        .pipe(fs.createWriteStream(zipPath))
        .on('finish', () => {
            fs.copyFileSync( zipPath, projectFilePath )
            fs.unlinkSync( zipPath )
            const finishTime = Date.now()
            log.info(`${zipPath} written in ${finishTime-startTime}ms`);
        });
}

async function openArchive() {
    const { projectFilePath } = workerData

    // create the archive based on worker data
    const data = fs.readFileSync(projectFilePath)
    const zip = await JSZip.loadAsync(data)
    const { cacheFolder, zipPath } = setupTempFolder()
    return { zip, cacheFolder, zipPath }
}

function closeArchive(zip,cacheFolder) {
    // execute any pending write jobs
    zip.flush()
    // TODO - wipe the temp dir
    process.exit()
}

function postError(errorMessage) {
    parentPort.postMessage({ messageType: 'error', errorMessage })
}

async function run() {
    const { zip, cacheFolder, zipPath } = await openArchive()
    let open = true

    parentPort.on('message', (msg) => {
        const { messageType } = msg

        if( !open ) {
            postError("Can't perform operations after archive is closed.")
            return
        }

        switch( messageType ) {
            case 'read-utf8':
                {
                    const { targetFilePath } = msg
                    readUTF8(targetFilePath, zip).then( (data) => {
                        parentPort.postMessage({ messageType: 'utf8-data', targetFilePath, data })
                    })
                }
                break
            case 'write-utf8':
                {
                    const { targetFilePath, data } = msg
                    writeUTF8( targetFilePath, data, zip )    
                }
                break
            case 'cache-resource':
                {
                    const { resourceID, filename } = msg
                    cacheResource(resourceID, filename, cacheFolder, zip).then( (cacheFile) => {
                        parentPort.postMessage({ messageType: 'cache-file-name', cacheFile })
                    })
                }
                break
            case 'add-file':
                {
                    const { localFilePath, resourceID } = msg
                    addFile( localFilePath, resourceID, zip )    
                }
                break            
            case 'save-archive':
                saveArchive(zipPath, zip)
                break
            case 'close-archive':
                open = false
                closeArchive(zip,cacheFolder)
                break    
            default:
                postError(`Unrecognized message type: ${messageType}`)
                break
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