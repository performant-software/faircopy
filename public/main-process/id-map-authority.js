
const getBlankResourceMap = function getBlankResourceMap(resourceID,resourceType) {
    return {
        resourceID,
        resourceType,
        ids: {}
    }
}

const resourceIDToLocalIDs = function resourceIDToLocalIDs( targetID, idMap, parentID=null ) {
    for( const localID of Object.keys(idMap) ) {
        const resourceMap = idMap[localID]
        const { resourceID, resourceType, ids } = resourceMap
        if( resourceID === targetID ) return { parentID, localID } 
        if( resourceType === 'teidoc' ) {
            return resourceIDToLocalIDs( targetID, ids, localID )
        } 
    }
    return null
}

exports.getBlankResourceMap = getBlankResourceMap
exports.resourceIDToLocalIDs = resourceIDToLocalIDs