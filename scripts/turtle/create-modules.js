

const createModules = function createModules(allElements,specs) {
    const modules = {}
    for( const element of allElements ) {
        const spec = specs[element]
        const { module } = spec
        if( modules[module] ) {
            modules[module].push(element)
        } else {
            modules[module] = [ element ]
        }            
    }
    for( const key of Object.keys(modules) ) {
        modules[key] = modules[key].sort()
    }

    return modules
}

// EXPORTS /////////////
module.exports.createModules = createModules
