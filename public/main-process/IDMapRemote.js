const { resourceIDToLocalIDs, getBlankResourceMap } = require('./id-map-authority')

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
        // this is the merged, read-only map
        this.idMap = {}
    }

    setBaseMap(idMapData) {
        // TODO scan for orphaned local resources and repair if necessary
        // this can happen if parent is deleted by another user
        this.baseMapJSON = idMapData
        this.sendIDMapUpdate()
    }

    setResourceMap( resourceMap, localID, parentID ) {
        if( parentID ) {
            if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID,'idMapNext') 
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
            if( this.idMapNext[parentID] && this.idMapNext[parentID].ids[localID] ) delete this.idMapNext[parentID].ids[localID]
        } else {
            if( this.idMapNext[localID] ) delete this.idMapNext[localID]
        }    
    }

    addResource( localID, parentID, resourceMap ) {       
        if( parentID ) {
            if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID,'idMapNext') 
            this.idMapNext[parentID].ids[localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }

        // return updated map
        return this.commitResource(localID, parentID)
    }

    removeResource( localID, parentID ) {
        if( parentID ) {
            if( this.idMapNext[parentID] && this.idMapNext[parentID].ids[localID] ) delete this.idMapNext[parentID].ids[localID]
            this.idMapStaged[parentID].ids[localID].deleted = true
        } else {
            if( this.idMapNext[localID] ) delete this.idMapNext[localID]
            this.idMapStaged[localID].deleted = true
        }

        return JSON.stringify(this.idMapStaged)
    }
    
    recoverResource( localID, parentID ) {
        if( parentID ) {
            if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID,'idMapNext') 
            this.idMapNext[parentID].ids[localID] = this.idMapStaged[parentID].ids[localID]
            delete this.idMapStaged[parentID].ids[localID].deleted 
        } else {
            this.idMapNext[localID] = this.idMapStaged[localID]
            delete this.idMapStaged[localID].deleted 
        }

        return JSON.stringify(this.idMapStaged)
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

        return JSON.stringify(this.idMapStaged)
    }

    getLocalIDs(resourceID) {
        return resourceIDToLocalIDs(resourceID,this.idMap)
    }

    checkIn( resources ) {
        const teiDocIDs = []
        for( const resource of resources ) {
            const { localID, parentID: parentResourceID } = resource
            if( parentResourceID ) {
                const { localID: parentLocalID } = this.getLocalIDs(parentResourceID)
                delete this.idMapStaged[parentLocalID].ids[localID] 
            } else {
                if( this.idMapStaged[localID].resourceType === 'teidoc' ) {
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
            if( !this.idMapStaged[parentID] ) this.idMapStaged[parentID] = this.copyParent(parentID,'idMapStaged') 
            this.idMapStaged[parentID].ids[localID] = this.idMapNext[parentID].ids[localID]
            delete this.idMapNext[parentID].ids[localID] 
        } else {
            this.idMapStaged[localID] = this.idMapNext[localID]
            delete this.idMapNext[localID]
        }    
        return JSON.stringify(this.idMapStaged)
    }

    copyParent( localID, layerID ) {
        if( layerID === 'idMapNext' ) {
            if( this.idMapStaged[localID] ) {
                const { resourceID, resourceType } = this.idMapStaged[localID]
                return getBlankResourceMap(resourceID, resourceType)
            } else if( this.idMapData[localID] ) {
                const { resourceID, resourceType } = this.idMapData[localID]
                return getBlankResourceMap(resourceID, resourceType)
            }  else {
                throw new Error(`Layer not found: ${localID}`)
            }
        } else if( layerID === 'idMapStaged' ) {
            if( this.idMapData[localID] ) {
                const { resourceID, resourceType } = this.idMapData[localID]
                return getBlankResourceMap(resourceID, resourceType)
            }  else {
                throw new Error(`Layer not found: ${localID}`)
            }
        } else {
            throw new Error("Invalid layer ID passed to copyParent()")
        }
    }

    sendIDMapUpdate() {
        const idMapData = JSON.parse( this.baseMapJSON )
        addLayer( idMapData, this.idMapStaged )
        addLayer( idMapData, this.idMapNext )
        this.idMap = idMapData
        this.onUpdate(this.idMap)
    }
}

function addLayer( idMapData, idMapLayer ) {
    for( const localID of Object.keys(idMapLayer) ) {
        if( idMapLayer[localID].deleted ) {
            // don't include maps for entries marked for deletion
            if( idMapData[localID] ) delete idMapData[localID]
        } else {
            // if this is an existing teidoc, merge ids, otherwise just copy over the lower layer
            if( idMapLayer[localID].resourceType === 'teidoc' && idMapData[localID] ) {
                addLayer( idMapData[localID].ids, idMapLayer[localID].ids )
            } else {
                idMapData[localID] = idMapLayer[localID]
            }
        }
    }
}

exports.IDMapRemote = IDMapRemote