
class IDMapAuthority {

    constructor( idMapData, resources ) {
        this.idMap = JSON.parse(idMapData)
        this.idMapNext = JSON.parse(idMapData)
        this.resourceIndex = {}
        for( const resourceID of Object.keys(resources) ) {
            const resourceEntry = resources[resourceID]
            const parentEntry = resources[resourceEntry.parentResource]
            this.resourceIndex[resourceID] = { localID: resourceEntry.localID, parentID: parentEntry?.localID }
        }
    }

    // update the resource map and broadcast the updated idMap, including any errors?
    update( idMapData ) {       
        this.idMapNext = JSON.parse(idMapData)
    }

    // restore the specified resource to its previously saved state
    abandonResourceMap( resourceID ) {
        const { localID, parentID } = this.resourceIndex[resourceID]

        // discard draft resource map and restore authoritative version
        if( parentID ) {
            this.idMapNext[parentID][localID] = this.idMap[parentID][localID]
        } else {
            this.idMapNext[localID] = this.idMap[localID]
        }
    }

    addResource( resourceEntry, resourceMap ) {
        const { id: resourceID, localID, parentResource } = resourceEntry
        const parentID = this.resourceIndex[parentResource]?.localID
        this.resourceIndex[resourceID] = { localID, parentID }
        
        if( parentID ) {
            this.idMapNext[parentID][localID] = resourceMap
        } else {
            this.idMapNext[localID] = resourceMap
        }

        // return updated map
        return this.commitResource(resourceID)
    }

    removeResource( resourceID ) {
        const { localID, parentID } = this.resourceIndex[resourceID]

        if( parentID ) {
            delete this.idMapNext[parentID][localID]
            delete this.idMap[parentID][localID]
        } else {
            delete this.idMapNext[localID]
            delete this.idMap[localID]
        }

        return JSON.stringify(this.idMap)
    }

    changeID( newID, resourceID ) {
        const { localID, parentID } = this.resourceIndex[resourceID]

        if( parentID ) {
            if( this.idMapNext[parentID][localID] && !this.idMapNext[parentID][newID] ) {
                this.idMapNext[parentID][newID] = this.idMapNext[parentID][localID]
                delete this.idMapNext[parentID][localID]
                this.resourceIndex[resourceID] = { localID: newID, parentID }
                return this.commitResource(resourceID)
            }    
        } else {
            if( this.idMapNext[localID] && !this.idMapNext[newID] ) {
                this.idMapNext[newID] = this.idMapNext[localID]
                delete this.idMapNext[localID]
                this.resourceIndex[resourceID] = { localID: newID, parentID: null }
                return this.commitResource(resourceID)
            }    
        }

        return null
    }

    commitResource( resourceID ) {
        const { localID, parentID } = this.resourceIndex[resourceID]

        // move resource map from draft form to authoritative
        if( parentID ) {
            this.idMap[parentID][localID] = this.idMapNext[parentID][localID]
        } else {
            this.idMap[localID] = this.idMapNext[localID]
        }

        return JSON.stringify(this.idMap)
    }
}

exports.IDMapAuthority = IDMapAuthority