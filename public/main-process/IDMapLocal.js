class IDMapLocal {

    constructor( idMapData, onUpdate ) {
        this.onUpdate = onUpdate
        // the base map is stored in the project file
        this.baseMapJSON = idMapData
        // this map is for unsaved changes made during editing 
        this.idMapNext = {}
    }

    setResourceMap( resourceMap, localID, parentID ) {
        if( parentID ) {
            if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = {}
            this.idMapNext[parentID][localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }
        // broadcast the updated map
        this.sendIDMapUpdate()
    }

    // restore the specified resource to its previously saved state
    abandonResourceMap( localID, parentID ) {
        if( parentID ) {
            delete this.idMapNext[parentID][localID]
        } else {
            delete this.idMapNext[localID]
        }    
    }

    addResource( localID, parentID, resourceMap ) {       
        if( parentID ) {
            if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = {}
            this.idMapNext[parentID][localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }

        // return updated map
        return this.commitResource(localID, parentID)   
    }

    removeResource( localID, parentID ) {
        const idMap = JSON.parse(this.baseMapJSON)

        if( parentID ) {
            delete this.idMapNext[parentID][localID]
            delete idMap[parentID][localID]
        } else {
            delete this.idMapNext[localID]
            delete idMap[localID]
        }
        this.baseMapJSON = JSON.stringify(idMap)
        return this.baseMapJSON
    }
    
    changeID( newID, oldID, parentID ) {

        if( parentID ) {
            if( this.idMapNext[parentID][oldID] && !this.idMapNext[parentID][newID] ) {
                this.idMapNext[parentID][newID] = this.idMapNext[parentID][oldID]
                delete this.idMapNext[parentID][oldID]
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

    commitResource( localID, parentID ) {
        // move resource map from draft to base map
        const idMap = JSON.parse(this.baseMapJSON)
        if( parentID ) {
            idMap[parentID][localID] = this.idMapNext[parentID][localID]
            delete this.idMapNext[parentID][localID] 
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
        this.onUpdate(idMapData)
    }
}

function addLayer( idMapData, idMapLayer ) {
    for( const localID of Object.keys(idMapLayer) ) {
        // if this is a resourceMap entry, copy it
        if( idMapLayer[localID].type ) {
            idMapData[localID] = idMapLayer[localID]
        } else {
            // otherwise, it is a parent map, add children 
            addLayer( idMapData[localID], idMapLayer[localID] )
        }
    }
}

exports.IDMapLocal = IDMapLocal