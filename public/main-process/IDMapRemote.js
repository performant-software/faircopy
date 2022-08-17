const { resourceIDToLocalIDs, getBlankResourceMap } = require('./id-map-authority')

class IDMapRemote {

    constructor( idMapData, onUpdate ) {
        this.onUpdate = onUpdate
        // the base map is updated by server 
        this.idMapBase = {}
        // the staged id map is stored in project file, 
        // it contains saved but not checked in resource maps 
        this.idMapStaged = JSON.parse(idMapData)
        // this map is for unsaved changes made during editing 
        this.idMapNext = {}
        // this is the merged, read-only map
        this.idMap = {}
    }

    setBaseMap(idMapData) {
        this.idMapBase = idMapData
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
            if( !this.idMapStaged[parentID] ) this.idMapStaged[parentID] = this.copyParent(parentID,'idMapStaged') 
            this.idMapStaged[parentID].ids[localID] = resourceMap
        } else {
            this.idMapStaged[localID] = resourceMap
        }

        return JSON.stringify(this.idMapStaged)
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const { localID, parentID } = resourceIDToLocalIDs(resourceID,this.idMapStaged)
            if( parentID ) {
                if( this.idMapNext[parentID] && this.idMapNext[parentID].ids[localID] ) delete this.idMapNext[parentID].ids[localID]
                this.idMapStaged[parentID].ids[localID].deleted = true
            } else {
                if( this.idMapNext[localID] ) delete this.idMapNext[localID]
                this.idMapStaged[localID].deleted = true
            }    
        }
        this.sendIDMapUpdate()    
        return JSON.stringify(this.idMapStaged)
    }
    
    recoverResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const { localID, parentID } = resourceIDToLocalIDs(resourceID,this.idMapStaged)
            if( parentID ) {
                if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID,'idMapNext') 
                this.idMapNext[parentID].ids[localID] = this.idMapStaged[parentID].ids[localID]
                delete this.idMapStaged[parentID].ids[localID].deleted 
            } else {
                this.idMapNext[localID] = this.idMapStaged[localID]
                delete this.idMapStaged[localID].deleted 
            }    
        } 
        this.sendIDMapUpdate()
        return JSON.stringify(this.idMapStaged)
    }

    changeID( newID, oldID, parentID ) {
        // move the resource map on both editable layers to the new address

        // update the next map 
        const nextResourceMap = parentID ? this.idMapNext[parentID].ids[oldID] : this.idMapNext[oldID]
        if( nextResourceMap ) {
            if( parentID ) {
                if(  !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID,'idMapNext') 
                this.idMapNext[parentID].ids[newID] = nextResourceMap
                if( this.idMapNext[parentID].ids[oldID] ) delete this.idMapNext[parentID].ids[oldID]
            } else {
                this.idMapNext[newID] = nextResourceMap
                if( this.idMapNext[oldID] ) delete this.idMapNext[oldID]
            }    
        }

        // update the staged map
        const stagedResourceMap = parentID ? this.idMapStaged[parentID].ids[oldID] : this.idMapStaged[oldID]
        if( stagedResourceMap ) {
            if( parentID ) {
                if(  !this.idMapStaged[parentID] ) this.idMapStaged[parentID] = this.copyParent(parentID,'idMapStaged') 
                this.idMapStaged[parentID].ids[newID] = stagedResourceMap
                if( this.idMapStaged[parentID].ids[oldID] ) delete this.idMapStaged[parentID].ids[oldID]
            } else {
                this.idMapStaged[newID] = stagedResourceMap
                if( this.idMapStaged[oldID] ) delete this.idMapStaged[oldID]
            }    
        }

        return JSON.stringify(this.idMapStaged)
    }

    getLocalIDs(resourceID) {
        return resourceIDToLocalIDs(resourceID,this.idMap)
    }

    getResourceMap(resourceID) {
        const { localID, parentID } = this.getLocalIDs(resourceID)
        if( parentID ) {
            return this.idMap[parentID].ids[localID]
        } else {
            return this.idMap[localID]
        }
    }

    checkIn( resourceEntries ) {
        // We're doing two things here. First, we're removing items that are no longer checked out from the idMapStaged. Second,
        // we are adding these updated items to idMapBase. This is just so that the data is immediately correct, the authoritative
        // update will come from the server shortly.
        const teiDocIDs = []
        for( const resourceEntry of resourceEntries ) {
            const { localID, parentResource: parentResourceID, deleted } = resourceEntry
            if( parentResourceID ) {
                const { localID: parentLocalID } = resourceIDToLocalIDs(parentResourceID,this.idMapStaged)
                if( deleted ) {
                    delete this.idMapBase[parentLocalID].ids[localID]
                } else {
                    if( !this.idMapBase[parentLocalID] ) this.idMapBase[parentLocalID] = getBlankResourceMap(parentResourceID, 'teidoc')
                    this.idMapBase[parentLocalID].ids[localID] = this.idMapStaged[parentLocalID].ids[localID]
                }
                delete this.idMapStaged[parentLocalID].ids[localID]
            } else {
                this.idMapBase[localID] = this.idMapStaged[localID]
                if( this.idMapStaged[localID].resourceType === 'teidoc' ) {
                    teiDocIDs.push( localID )
                } else {
                    if( deleted ) {
                        delete this.idMapBase[localID]          
                    } 
                    delete this.idMapStaged[localID]                     
                }    
            }
        }
        // only remove teidoc if it has no children left in this map 
        for( const teiDocID of teiDocIDs ) {
            if( Object.keys(this.idMapStaged[teiDocID]).length === 1 ) {
                delete this.idMapStaged[teiDocID]
            }
            if( Object.keys(this.idMapBase[teiDocID]).length === 1 ) {
                delete this.idMapBase[teiDocID]
            }
        }
    }

    checkOut( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const { parentID, localID } = resourceIDToLocalIDs(resourceID, this.idMapBase)
            if( parentID ) {
                if( !this.idMapStaged[parentID] ) this.idMapStaged[parentID] = this.copyParent(parentID,'idMapStaged') 
                this.idMapStaged[parentID].ids[localID] = this.idMapBase[parentID].ids[localID]
            } else {
                this.idMapStaged[localID] = this.idMapBase[localID]
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
            } else if( this.idMapBase[localID] ) {
                const { resourceID, resourceType } = this.idMapBase[localID]
                return getBlankResourceMap(resourceID, resourceType)
            }  else {
                throw new Error(`Layer not found: ${localID}`)
            }
        } else if( layerID === 'idMapStaged' ) {
            if( this.idMapBase[localID] ) {
                const { resourceID, resourceType } = this.idMapBase[localID]
                return getBlankResourceMap(resourceID, resourceType)
            }  else {
                throw new Error(`Layer not found: ${localID}`)
            }
        } else {
            throw new Error("Invalid layer ID passed to copyParent()")
        }
    }

    sendIDMapUpdate() {
        this.idMap = JSON.parse(JSON.stringify(this.idMapBase))
        addLayer( this.idMap, this.idMapStaged )
        addLayer( this.idMap, this.idMapNext )
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