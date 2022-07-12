class IDMapLocal {

    constructor( idMapData, onUpdate ) {
        this.onUpdate = onUpdate
        // the base map is stored in the project file
        this.baseMapJSON = idMapData
        // this map is for unsaved changes made during editing 
        this.idMapNext = {}
        // this is the merged, read-only map
        this.idMap = {}
    }

    setResourceMap( resourceMap, localID, parentID ) {
        if( parentID ) {
            this.idMapNext[parentID].ids[localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }
        // broadcast the updated map
        this.sendIDMapUpdate()
    }

    // restore the specified resource to its previously saved state
    abandonResourceMap( localID, parentID ) {
        if( parentID ) {
            delete this.idMapNext[parentID].ids[localID]
        } else {
            delete this.idMapNext[localID]
        }    
    }

    addResource( localID, parentID, resourceMap ) {       
        if( parentID ) {
            this.idMapNext[parentID].ids[localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }

        // return updated map
        return this.commitResource(localID, parentID)   
    }

    removeResource( localID, parentID ) {
        const idMap = JSON.parse(this.baseMapJSON)

        if( parentID ) {
            delete this.idMapNext[parentID].ids[localID]
            delete idMap[parentID].ids[localID]
        } else {
            delete this.idMapNext[localID]
            delete idMap[localID]
        }
        this.baseMapJSON = JSON.stringify(idMap)
        return this.baseMapJSON
    }
    
    changeID( newID, oldID, parentID ) {

        if( parentID ) {
            if( this.idMapNext[parentID].ids[oldID] && !this.idMapNext[parentID].ids[newID] ) {
                this.idMapNext[parentID].ids[newID] = this.idMapNext[parentID].ids[oldID]
                delete this.idMapNext[parentID].ids[oldID]
                return this.commitResource(newID,parentID)
            }    
        } else {
            if( this.idMapNext[oldID] && !this.idMapNext[newID] ) {
                this.idMapNext[newID] = this.idMapNext[oldID]
                delete this.idMapNext[oldID]
                return this.commitResource(newID,parentID)
            }    
        }

        return this.baseMapJSON
    }

    getLocalIDs(resourceID) {
        return resourceIDToLocalIDs(resourceID,this.idMap)
    }

    commitResource( localID, parentID ) {
        // move resource map from draft to base map
        const idMap = JSON.parse(this.baseMapJSON)
        if( parentID ) {
            idMap[parentID].ids[localID] = this.idMapNext[parentID].ids[localID]
            delete this.idMapNext[parentID].ids[localID] 
        } else {
            idMap[localID] = this.idMapNext[localID]
            delete this.idMapNext[localID]
        }    
        this.baseMapJSON = JSON.stringify(idMap)
        return this.baseMapJSON   
    }

    sendIDMapUpdate() {
        const idMapData = JSON.parse( this.baseMapJSON )
        addLayer( idMapData, this.idMapNext )
        this.idMap = idMapData
        this.onUpdate(this.idMap)
    }
}

function addLayer( idMapData, idMapLayer ) {
    for( const localID of Object.keys(idMapLayer) ) {
        if( idMapLayer[localID].resourceType === 'teidoc' && idMapData[localID] ) {
            addLayer( idMapData[localID].ids, idMapLayer[localID].ids )
        } else {
            idMapData[localID] = idMapLayer[localID]
        }
    }
}

exports.IDMapLocal = IDMapLocal