export function mapResource( resourceEntry, content ) {
    return (resourceEntry.type === 'facs') ? mapFacsIDs(resourceEntry,content) : mapTextIDs(resourceEntry,content)
}

export function getBlankResourceMap(resourceID,resourceType) {
    return {
        resourceID,
        resourceType,
        ids: {}
    }
}

export function resourceIDToLocalIDs( targetID, idMap, parentID=null ) {
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

function getTextEntry() {
    return { type: 'text', useCount: 1 }
}

function mapFacsIDs(resourceEntry,facs) {
    const resourceMap = getBlankResourceMap(resourceEntry.id, resourceEntry.type)
    const { surfaces } = facs

    const facsIDMap = resourceMap.ids
    for( const surface of surfaces ) {
        const thumbnailURL = surface.type === 'iiif' ? getThumbnailURL(surface) : `local://${surface.resourceEntryID}`
        facsIDMap[surface.id] = { type: 'facs', thumbnailURL }

        for( const zone of surface.zones ) {
            facsIDMap[zone.id] = { type: 'zone' }
        }
    }

    return facsIDMap
}

function mapTextIDs(resourceEntry,doc) {        
    const resourceMap = getBlankResourceMap(resourceEntry.id, resourceEntry.type)
    const xmlIDMap = resourceMap.ids
    
    // gather up all xml:ids and their nodes/marks
    doc.descendants((node) => {
        const id = node.attrs['xml:id']
        if( id ) {
            if( xmlIDMap[id] && xmlIDMap[id].useCount ) {
                xmlIDMap[id].useCount++
            } else {
                xmlIDMap[id] = getTextEntry()
            }    
        }
        return true
    })

    return xmlIDMap
}

function getThumbnailURL( surface, width=120 ) {
    const { imageAPIURL } = surface
    const slash = imageAPIURL.endsWith('/') ? '' : '/'
    return `${imageAPIURL}${slash}full/${width},/0/default.jpg`
}