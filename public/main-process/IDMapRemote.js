const log = require('electron-log')

class IDMapRemote {

    constructor( idMapData, onUpdate ) {
        this.onUpdate = onUpdate
        // the base map is updated by server 
        this.baseMapJSON = "{}"
        // the staged id map is stored in project file, 
        // it contains saved but not checked in resource maps 
        this.idMapStaged = JSON.parse(idMapData)
        // this map is for unsaved changes made during editing 
        this.idMapNext = {}
    }

    setBaseMap(idMapData) {
        // TODO scan for orphaned local resources and repair if necessary
        // this can happen if parent is deleted by another user
        this.baseMapJSON = idMapData
        this.sendIDMapUpdate()
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
        if( parentID ) {
            delete this.idMapNext[parentID][localID]
            this.idMapStaged[parentID][localID].___deleted___ = true
        } else {
            delete this.idMapNext[localID]
            this.idMapStaged[localID].___deleted___ = true
        }

        return JSON.stringify(this.idMapStaged)
    }
    
    recoverResource( localID, parentID ) {
        if( parentID ) {
            this.idMapNext[parentID][localID] = this.idMapStaged[parentID][localID]
            delete this.idMapStaged[parentID][localID].___deleted___ 
        } else {
            this.idMapNext[localID] = this.idMapStaged[parentID][localID]
            delete this.idMapStaged[localID].___deleted___ 
        }

        return JSON.stringify(this.idMapStaged)
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

        return JSON.stringify(this.idMapStaged)
    }

    checkIn( resources ) {
        const teiDocIDs = []
        for( const resource of resources ) {
            const { localID, parentID } = resource
            if( parentID ) {
                delete this.idMapStaged[parentID][localID] 
            } else {
                if( this.idMapStaged[localID].__multiPart__ ) {
                    teiDocIDs.push( localID )
                } else {
                    delete this.idMapStaged[localID]                     
                }
            }
        }
        // only remove teidoc if it has no children left in this map 
        for( const teiDocID of teiDocIDs ) {
            if( Object.keys(this.idMapStaged[teiDocID]).length === 1 ) {
                delete this.idMapStaged[teiDocID]
            }
        }
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
        return JSON.stringify(this.idMapStaged)
    }

    sendIDMapUpdate() {
        const idMapData = JSON.parse( this.baseMapJSON )
        addLayer( idMapData, this.idMapStaged )
        addLayer( idMapData, this.idMapNext )
        this.onUpdate(idMapData)
    }
}

function addLayer( idMapData, idMapLayer ) {
    log.info("addLayer")
    for( const localID of Object.keys(idMapLayer) ) {
        if( idMapLayer[localID].___deleted___ ) {
           if( idMapData[localID] ) delete idMapData[localID]
        } else {
            // if this is a resourceMap entry, copy it
            if( idMapLayer[localID].type ) {
                idMapData[localID] = idMapLayer[localID]
            } else {
                // otherwise, it is a parent map, add children 
                if( !idMapData[localID] ) idMapData[localID] = {}
                addLayer( idMapData[localID], idMapLayer[localID] )
            }
        }
    }
}

exports.IDMapRemote = IDMapRemote