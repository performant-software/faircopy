const { workerData, parentPort } = require('worker_threads')
const JSZip = require('jszip')
const fs = require('fs')
const os = require('os')
const log = require('electron-log')
// const debounce = require('debounce')

const manifestEntryName = 'faircopy-manifest.json'
const configSettingsEntryName = 'config-settings.json'
const idMapEntryName = 'id-map.json'

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

    // const zipWriteDelay = 200

     // create a debounced function for writing the ZIP
    //  this.writeProjectArchive = debounce(() => {
    //     const jobNumber = Date.now()
    //     this.jobsInProgress.push(jobNumber)

    //     // if there was a migration that hasn't been saved yet, save it now
    //     if( this.migratedConfig ) {
    //         this.saveFairCopyConfig( this.migratedConfig ) 
    //     }

    //     // write to a temp file first, to avoid corrupting the ZIP if we can't finish for some reason.
    //     const tempPath = `${this.tempDir}/${jobNumber}.zip`
    //     writeArchive( tempPath, this.projectArchive, () => { 
    //         fs.copyFileSync( tempPath, this.projectFilePath )
    //         fs.unlinkSync( tempPath )
    //         this.jobsInProgress.pop() 
    //     })
    // },zipWriteDelay)

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

    const fairCopyManifest = await readUTF8(manifestEntryName,zip)
    let fairCopyConfig = await readUTF8(configSettingsEntryName,zip)
    const idMap = await readUTF8(idMapEntryName,zip)

    // send initial project data back to project store
    const projectData = { fairCopyManifest, fairCopyConfig, idMap, projectFilePath }
    parentPort.postMessage({ messageType: 'project-data', projectData })

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
            case 'read-resource':
                {
                    const { resourceID } = msg
                    readUTF8(resourceID, zip).then( (resource) => {
                        parentPort.postMessage({ messageType: 'resource-data', resourceID, resource })
                    })
                }
                break
            case 'read-index':
                {
                    const { resourceID } = msg
                    const indexID = `${resourceID}.index`
                    readUTF8(indexID, zip).then( (index) => {
                        parentPort.postMessage({ messageType: 'index-data', resourceID, index })
                    })
                }
                break
            case 'write-resource':
                {
                    const { resourceID, data } = msg
                    writeUTF8( resourceID, data, zip )    
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
                    const { resourceID, filename } = msg
                    cacheResource(resourceID, filename, cacheFolder, zip).then( (cacheFile) => {
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
            case 'save':
                saveArchive(zipPath, zip)
                break
            case 'close':
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