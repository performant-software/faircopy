const { resourceIDToLocalIDs, getBlankResourceMap } = require('./id-map-authority')

class IDMapLocal {

    constructor( idMapData, onUpdate ) {
        this.onUpdate = onUpdate
        // the base map is stored in the project file
        this.idMapBase = JSON.parse(idMapData)
        // this map is for unsaved changes made during editing 
        this.idMapNext = {}
        // this is the merged, read-only map
        this.idMap = JSON.parse(idMapData)
    }

    setResourceMap( resourceMap, localID, parentID ) {
        if( parentID ) {
            if( !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID) 
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
            if( !this.idMapBase[parentID] ) this.idMapBase[parentID] = this.copyParent( localID )
            this.idMapBase[parentID].ids[localID] = resourceMap
        } else {
            this.idMapBase[localID] = resourceMap
        }

        return JSON.stringify(this.idMapBase)
    }

    removeResources( resourceIDs ) {
        for( const resourceID of resourceIDs ) {
            const { localID, parentID } = resourceIDToLocalIDs(resourceID,this.idMapBase)
            if( parentID ) {
                if( this.idMapNext[parentID] && this.idMapNext[parentID].ids[localID] ) delete this.idMapNext[parentID].ids[localID]
                delete this.idMapBase[parentID].ids[localID]
            } else {
                if( this.idMapNext[localID] ) delete this.idMapNext[localID]
                delete this.idMapBase[localID]
            }    
        }
        this.sendIDMapUpdate()    
        return JSON.stringify(this.idMapBase)
    }

    moveResourceMap( localID, oldLocalID, targetParentResource, oldParentResourceID ) {
        const targetParentID = targetParentResource ? this.getLocalIDs(targetParentResource)?.localID : null
        const oldParentID = oldParentResourceID ? this.getLocalIDs(oldParentResourceID)?.localID : null

        // the resource map being moved
        let resourceMap

        // remove the resourceMap from the old parent, prefering latest state from idMapNext
        if( oldParentID ) {
            if( this.idMapNext[oldParentID] && this.idMapNext[oldParentID].ids[oldLocalID] ) {
                resourceMap = this.idMapNext[oldParentID].ids[oldLocalID]
                delete this.idMapNext[oldParentID].ids[oldLocalID]
            } else {
                resourceMap = this.idMapBase[oldParentID].ids[oldLocalID]
            }
            delete this.idMapBase[oldParentID].ids[oldLocalID]
        } else {
            if( this.idMapNext[oldLocalID] ) {
                resourceMap = this.idMapNext[oldLocalID]
                delete this.idMapNext[oldLocalID]
            } else {
                resourceMap = this.idMapBase[oldLocalID]
            }
            delete this.idMapBase[oldLocalID]
        }  

        // add it to the new parent
        if( targetParentID ) {
            if( !this.idMapBase[targetParentID] ) this.idMapBase[targetParentID] = this.copyParent( localID )
            this.idMapBase[targetParentID].ids[localID] = resourceMap
        } else {
            this.idMapBase[localID] = resourceMap
        }
        
        return JSON.stringify(this.idMapBase)
    }

    changeID( newID, oldID, parentID ) {
        // move the resource map on both editable layers to the new address

        // update the next map 
        const nextResourceMap = parentID ? this.idMapNext[parentID]?.ids[oldID] : this.idMapNext[oldID]
        if( nextResourceMap ) {
            if( parentID ) {
                if(  !this.idMapNext[parentID] ) this.idMapNext[parentID] = this.copyParent(parentID) 
                this.idMapNext[parentID].ids[newID] = nextResourceMap
                if( this.idMapNext[parentID].ids[oldID] ) delete this.idMapNext[parentID].ids[oldID]
            } else {
                this.idMapNext[newID] = nextResourceMap
                if( this.idMapNext[oldID] ) delete this.idMapNext[oldID]
            }    
        }

        // update the staged map
        const baseResourceMap = parentID ? this.idMapBase[parentID]?.ids[oldID] : this.idMapBase[oldID]
        if( baseResourceMap ) {
            if( parentID ) {
                if(  !this.idMapBase[parentID] ) this.idMapBase[parentID] = this.copyParent(parentID) 
                this.idMapBase[parentID].ids[newID] = baseResourceMap
                if( this.idMapBase[parentID].ids[oldID] ) delete this.idMapBase[parentID].ids[oldID]
            } else {
                this.idMapBase[newID] = baseResourceMap
                if( this.idMapBase[oldID] ) delete this.idMapBase[oldID]
            }    
        }

        return JSON.stringify(this.idMapBase)
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

    getResourceMapByLocalID(localID,parentID) {
        return parentID ? this.idMap[parentID].ids[localID] : this.idMap[localID]
    }
    
    commitResource( localID, parentID ) {
        // move resource map from draft form to authoritative
        if( parentID ) {
            if( !this.idMapBase[parentID] ) this.idMapBase[parentID] = this.copyParent(parentID) 
            this.idMapBase[parentID].ids[localID] = this.idMapNext[parentID].ids[localID]
            delete this.idMapNext[parentID].ids[localID] 
        } else {
            this.idMapBase[localID] = this.idMapNext[localID]
            delete this.idMapNext[localID]
        }    
        return JSON.stringify(this.idMapBase)
    }

    sendIDMapUpdate() {
        this.idMap = JSON.parse(JSON.stringify(this.idMapBase))
        addLayer( this.idMap, this.idMapNext )
        this.onUpdate(this.idMap)
    }

    copyParent( localID ) {
        if( this.idMapBase[localID] ) {
            const { resourceID, resourceType } = this.idMapBase[localID]
            return getBlankResourceMap(resourceID, resourceType)
        }  else {
            throw new Error(`Layer not found: ${localID}`)
        }
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