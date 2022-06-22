class IDMapRemote {

    constructor( idMapData, fairCopyApplication ) {
        this.fairCopyApplication = fairCopyApplication
        // the base map is updated by server 
        this.baseMapJSON = "{}"
        // the staged id map is stored in project file, 
        // it contains saved but not checked in resource maps 
        this.idMapStaged = JSON.parse(idMapData)
        // this map is for unsaved changes made during editing 
        this.idMapNext = {}
    }

    setBaseMap(idMapData) {
        this.baseMapJSON = idMapData
        this.sendIDMapUpdate()
    }

    setResourceMap( resourceMap, localID, parentID ) {
        if( parentID ) {
            this.idMapNext[parentID][localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }
        // broadcast the updated map
        this.sendIDMapUpdate()
    }

    // restore the specified resource to its previously saved state
    abandonResourceMap( localID, parentID ) {
        // discard draft resource map and restore authoritative version
        if( parentID ) {
            this.idMapNext[parentID][localID] = this.idMap[parentID][localID]
        } else {
            this.idMapNext[localID] = this.idMap[localID]
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
        if( parentID ) {
            delete this.idMapNext[parentID][localID]
            this.idMapStaged[parentID][localID].___deleted___ = true
        } else {
            delete this.idMapNext[localID]
            this.idMapStaged[localID].___deleted___ = true
        }

        return this.combineMapLayers()
    }
    
    recoverResource( localID, parentID ) {
        if( parentID ) {
            this.idMapNext[parentID][localID] = this.idMapStaged[parentID][localID]
            delete this.idMapStaged[parentID][localID].___deleted___ 
        } else {
            this.idMapNext[localID] = this.idMapStaged[parentID][localID]
            delete this.idMapStaged[localID].___deleted___ 
        }

        return this.combineMapLayers()
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

        return null
    }

    commitResource( localID, parentID ) {
        // move resource map from draft form to authoritative
        if( parentID ) {
            if( !this.idMapStaged[parentID] ) this.idMapStaged[parentID] = {}
            this.idMapStaged[parentID][localID] = this.idMapNext[parentID][localID]
            delete this.idMapNext[parentID][localID] 
        } else {
            this.idMapStaged[localID] = this.idMapNext[localID]
            delete this.idMapNext[localID]
        }    
        return this.combineMapLayers()     
    }

    combineMapLayers() {
        const idMapData = JSON.parse( this.baseMapJSON )
        addLayer( idMapData, this.idMapStaged )
        addLayer( idMapData, this.idMapNext )
        return idMapData
    }

    sendIDMapUpdate() {
        const idMapData = this.combineMapLayers()
        this.fairCopyApplication.sendToAllWindows('IDMapUpdated', { idMapData } )
    }
}

function addLayer( idMapData, idMapLayer ) {
    for( const localID of Object.keys(idMapLayer) ) {
        if( idMapLayer[localID].___deleted___ ) {
           delete idMapData[localID]
        } else {
            // if this is a resourceMap entry, copy it
            if( idMapLayer[localID].type ) {
                idMapData[localID] = idMapLayer[localID]
            } else {
                // otherwise, it is a parent map, add children 
                addLayer( idMapData[localID], idMapLayer[localID] )
            }
        }
    }
}

exports.IDMapRemote = IDMapRemote