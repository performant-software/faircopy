const JSZip = require('jszip')
const fs = require('fs')
const { manifestEntryName, configSettingsEntryName, idMapEntryName } = require('./ProjectStore')

const createProjectArchive = function createProjectArchive(projectInfo,baseDir,callback) {
    const { projectID, name, userID, serverURL, description, filePath, remote, generatedWith } = projectInfo
    const projectArchive = new JSZip()      
   
    const fairCopyManifest = {
        projectID,
        projectName: name,
        description: description,
        generatedWith,
        remote,
        serverURL,
        userID,
        resources: {}
    }

    // Load the initial config for the project
    const fairCopyConfig = fs.readFileSync(`${baseDir}/config/faircopy-config.json`).toString('utf-8')

    projectArchive.file(manifestEntryName, JSON.stringify(fairCopyManifest))
    projectArchive.file(configSettingsEntryName, fairCopyConfig)
    projectArchive.file(idMapEntryName, "{}")
    
    projectArchive
        .generateNodeStream({
            type:'nodebuffer',
            compression: "DEFLATE",
            compressionOptions: {
                level: 1
            },
            streamFiles:true
        })
        .pipe(fs.createWriteStream(filePath))
        .on('finish', callback);
}

exports.createProjectArchive = createProjectArchive