const JSZip = require('jszip')
const fs = require('fs')
const { manifestEntryName, configSettingsEntryName, idMapEntryName } = require('./ProjectStore')

const createProjectArchive = function createProjectArchive(projectInfo,baseDir,callback) {
    const { projectID, name, userID, permissions, serverURL, description, filePath, remote, defaultProjectCSS, generatedWith } = projectInfo
    const projectArchive = new JSZip()      
   
    const fairCopyManifest = {
        projectID,
        projectName: name,
        description: description,
        generatedWith,
        remote,
        serverURL,
        userID,
        permissions,
        resources: {},
        configLastAction: null
    }

    // Load the initial config for the project and mix in default CSS
    const fairCopyConfigJSON = fs.readFileSync(`${baseDir}/faircopy-config.json`).toString('utf-8')
    const fairCopyConfig = JSON.parse(fairCopyConfigJSON)
    fairCopyConfig.projectCSS = defaultProjectCSS
    fairCopyConfig.colorCodings = { '__default__': 'blue' }
    
    projectArchive.file(manifestEntryName, JSON.stringify(fairCopyManifest))
    projectArchive.file(configSettingsEntryName, JSON.stringify(fairCopyConfig))
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