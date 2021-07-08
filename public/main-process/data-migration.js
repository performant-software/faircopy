const semver = require('semver')

// project files are backward compatible but not forward compatible
const compatibleProject = function compatibleProject(manifestData, currentVersion) {
    const projectVersion = manifestData.generatedWith ? manifestData.generatedWith : '0.9.4'  // this field was added in 0.9.5
    return currentVersion === projectVersion || semver.gt(currentVersion, projectVersion)
}

const migrateConfig = function migrateConfig( currentVersion, generatedWith, baseConfigJSON, projectConfigJSON ) {
    const projectVersion = generatedWith ? generatedWith : '0.9.4'
    const baseConfig = JSON.parse(baseConfigJSON)
    const projectConfig = JSON.parse(projectConfigJSON)

    // same project version
    if( currentVersion === projectVersion ) return null

    // migrations for 0.10.1
    if( semver.lt(projectVersion,'0.10.1') ) {
        migrationAddMenus(projectConfig,baseConfig)
        migrationAddActiveState(projectConfig)
        migrationAddNewElements(baseConfig,projectConfig)
    }

    return JSON.stringify(projectConfig)
}

exports.compatibleProject = compatibleProject
exports.migrateConfig = migrateConfig

//// MIGRATIONS /////////////////////////////////////////////////

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