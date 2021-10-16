const { WorkerWindow } = require('./WorkerWindow')

class SearchIndex {

    constructor( schemaJSON, projectStore, onStatusUpdate ) {
        this.projectStore = projectStore
        this.onStatusUpdate = onStatusUpdate
        this.searchIndexStatus = {} 

        const {baseDir} = this.projectStore.fairCopyApplication
        const debug = this.projectStore.fairCopyApplication.isDebugMode()
        this.initIndexWorker(baseDir,debug,schemaJSON).then(() => {
            this.initSearchIndex( this.projectStore.manifestData )                
        })
    }

    initSearchIndex(manifestData) {
        const { resources } = manifestData
        for( const resourceID of Object.keys(resources) ) {
            const resourceEntry = resources[resourceID]
            if( this.isIndexable(resourceEntry.type) ) {
                this.searchIndexStatus[resourceID] = 'loading'
                this.projectStore.requestIndex( resourceID )
            }
        }    
    }

    close() {
        this.indexWorker.close()
    }

    initIndexWorker(baseDir,debug,schemaJSON) {        
        this.indexWorker = new WorkerWindow( baseDir, debug, 'search-index', (response) => {
            const { messageType } = response
            
            switch(messageType) {
                case 'resource-added':
                    {
                        const { resourceID } = response
                        this.searchIndexStatus[resourceID] = 'ready'
                        this.checkStatus()
                    }
                    break
                case 'resource-removed':
                    {
                        const { resourceID } = response
                        delete this.searchIndexStatus[resourceID]
                        this.checkStatus()
                    }
                    break
                case 'search-results':
                    {
                        const { searchResults } = response
                        this.projectStore.fairCopyApplication.sendToMainWindow('searchResults',searchResults)    
                    }
                    break
                default:
                    throw new Error(`Unrecognized message type: ${messageType}`)    
            }
        })

        return this.indexWorker.start({schemaJSON})
    }

    isIndexable(resourceType) {
        return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
    }

    indexResource( resourceID, resourceType, content ) {
        if( this.isIndexable(resourceType ) ) {
            this.searchIndexStatus[resourceID] = 'loading'
            this.checkStatus()
            this.indexWorker.postMessage({ messageType: 'add-resource', resourceID, resourceType, content })     
        }
    }

    checkStatus() {
        for( const resourceID of Object.keys(this.searchIndexStatus) ) {
            const status = this.searchIndexStatus[resourceID]
            if( status !== 'ready' ) {
                this.onStatusUpdate(false)     
                return false
            }
        }
        this.onStatusUpdate(true)
        return true
    }

    removeIndex(resourceID) {
        if( this.searchIndexStatus[resourceID] ) {
            this.indexWorker.postMessage({ messageType: 'remove-resource', resourceID })
        }
    }

    searchProject( searchQuery ) {
        this.indexWorker.postMessage({ messageType: 'search', searchQuery })
    }

}

exports.SearchIndex = SearchIndex