class IDMapAuthority {

    constructor( idMapData, remote, fairCopyApplication ) {
        this.fairCopyApplication = fairCopyApplication
        this.remote = remote
        this.initIDMap(idMapData)
    }

    initIDMap(idMapData) {
        if( this.remote ) {
            // TODO
        } else {
            this.idMap = JSON.parse(idMapData)
            this.idMapNext = JSON.parse(idMapData)    
        }
    }

    setBaseMap(idMapData) {
        // TODO process id map from server
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
            delete this.idMap[parentID][localID]
        } else {
            delete this.idMapNext[localID]
            delete this.idMap[localID]
        }

        return JSON.stringify(this.idMap)
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
            this.idMap[parentID][localID] = this.idMapNext[parentID][localID]
        } else {
            this.idMap[localID] = this.idMapNext[localID]
        }

        return JSON.stringify(this.idMap)
    }

    sendIDMapUpdate() {
        const idMapData = JSON.stringify( this.idMapNext )
        this.fairCopyApplication.sendToAllWindows('IDMapUpdated', { idMapData } )
    }
}

exports.IDMapAuthority = IDMapAuthority