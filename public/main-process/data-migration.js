const semver = require('semver')
const log = require('electron-log')
const { getBlankResourceMap } = require('./id-map-authority')

function getProjectVersion(generatedWith) {
    const ver = generatedWith ? generatedWith : '0.9.4'  // this field was added in 0.9.5
    // ignore any pre-release fields (e.g "1.1.1-dev.8")
    return `${semver.major(ver)}.${semver.minor(ver)}.${semver.patch(ver)}`
}

// project files are backward compatible but not forward compatible
const compatibleProject = function compatibleProject(manifestData, currentVersion) {
    const projectVersion = getProjectVersion(manifestData.generatedWith)
    const simpleCurrentVersion = getProjectVersion(currentVersion)
    return simpleCurrentVersion === projectVersion || semver.gt(simpleCurrentVersion, projectVersion)
}

const migrateConfig = function migrateConfig( generatedWith, baseConfig, projectConfig ) {
    const projectVersion = getProjectVersion(generatedWith)

    // always keep projectConfig up to date with latest elements
    migrationRemoveElements(projectConfig,baseConfig)
    migrationAddNewElements(baseConfig,projectConfig)

    if( semver.lt(projectVersion,'1.1.5') ) {
        migrationAddKeybindings(projectConfig)
        log.info('applying migrations for v1.1.5')
    }

    if( semver.lt(projectVersion,'0.10.1') ) {
        migrationAddMenus(projectConfig,baseConfig)
        migrationAddActiveState(projectConfig)
        log.info('applying migrations for v0.10.1')
    }
}

const migrateIDMap = function migrateIDMap( generatedWith, idMapJSON, localResources ) {
    const projectVersion = getProjectVersion(generatedWith)

    if( semver.lt(projectVersion,'1.1.1') ) {
        log.info('applying IDMap migration for v1.1.1')
        const idMap = JSON.parse(idMapJSON)
        return JSON.stringify( migrationRemoteIDMaps(idMap,localResources) )
    } else {
        return idMapJSON
    }
}

const migrateManifestData = function migrateManifestData( manifestData ) {
    const projectVersion = getProjectVersion(manifestData.generatedWith)
    let nextManifestData = manifestData

    if( semver.lt(projectVersion,'1.1.1') ) {
        log.info('applying manifest data migration for v1.1.1')
        nextManifestData = migrationRemoteManifestData( nextManifestData )
    } 

    if( semver.lt(projectVersion,'1.1.3') ) {
        log.info('applying manifest data migration for v1.1.3')
        nextManifestData = migrationPermissions( nextManifestData )
    } 
    
    return manifestData
}

exports.compatibleProject = compatibleProject
exports.migrateConfig = migrateConfig
exports.migrateIDMap = migrateIDMap
exports.migrateManifestData = migrateManifestData

//// MIGRATIONS /////////////////////////////////////////////////

function migrationAddKeybindings(projectConfig) {
    projectConfig.keybindings = {}
}

function migrationAddNewElements(baseConfig,projectConfig) {
    const baseElements = Object.keys(baseConfig.elements)
    const projectElements = Object.keys(projectConfig.elements)

    // add any elements that are new to the schema 
    for( const baseElement of baseElements ) {
        if( !projectElements.includes(baseElement) ) {
            projectConfig.elements[baseElement] = baseConfig.elements[baseElement]
        }
    }
}

function migrationAddMenus(projectConfig,baseConfig) {
    // if save file is pre v0.10.1, add menu data to config
    if( !projectConfig.menus ) {
        projectConfig.menus = baseConfig.menus
    }
}

function migrationAddActiveState(projectConfig) {
    for( const element of Object.values(projectConfig.elements) ) {
        element.active = true
    }
}

function migrationRemoveElements(projectConfig,baseConfig) {
    const baseElements = Object.keys(baseConfig.elements)
    const projectElements = Object.keys(projectConfig.elements)

    // remove any elements that are no longer in the schema 
    for( const projectElement of projectElements ) {
        if( !baseElements.includes(projectElement) ) {
            delete projectElements[projectElement]
        }
    }
}

function migrationRemoteIDMaps(idMap,localResources) {
    const nextIDMap = {}

    const teiDocs = Object.values(localResources).filter( r => r.type === 'teidoc' )
    for( const resourceEntry of teiDocs ) {
        const { id, localID } = resourceEntry

        nextIDMap[localID] = getBlankResourceMap( id, 'teidoc' )

        // find all the children of this teidoc
        const children = Object.values(localResources).filter( r => r.parentResource === id )
        for( const child of children ) {
            const childMap = getBlankResourceMap( child.id, child.type )
            childMap.ids = idMap[localID][child.localID]
            nextIDMap[localID].ids[child.localID] = childMap
        }
    }

    const topResources = Object.values(localResources).filter( r => r.type !== 'teidoc' && !r.parentResource )

    for( const resourceEntry of topResources ) {
        const { id, localID, type } = resourceEntry
        nextIDMap[localID] = getBlankResourceMap( id, type )
        nextIDMap[localID].ids = idMap[localID]
    }
        
    return nextIDMap
}

const cloudInitialConfig = {
    local: true,
    deleted: false,
    gitHeadRevision: null,
    lastAction: null
}

function migrationRemoteManifestData( manifestData ) {
    // all project previous to v1.1.1 are not remote
    manifestData.remote = false
    for( const resourceID of Object.keys(manifestData.resources)) {
        const resourceEntry = manifestData.resources[resourceID]
        if( resourceEntry.resources ) delete resourceEntry.resources
        manifestData.resources[resourceID] = { ...resourceEntry, ...cloudInitialConfig }
    }
    return manifestData
}

function migrationPermissions( manifestData ) {
    manifestData.permissions = []
    manifestData.userID = null
    manifestData.configLastAction = null
    return manifestData    
}