const { WorkerWindow } = require('./WorkerWindow')
const log = require('electron-log')
const { app } = require('electron')

const checkStatusInterval = 300

class SearchIndex {

    constructor( schemaJSON, projectStore, onStatusUpdate ) {
        this.projectStore = projectStore
        this.onStatusUpdate = onStatusUpdate
        this.searchIndexStatus = {} 
        this.indexing = false

        const {baseDir} = this.projectStore.fairCopyApplication
        const debug = !app.isPackaged
        this.initIndexWorker(baseDir,debug,schemaJSON).then(() => {
            this.initSearchIndex( this.projectStore.manifestData )                
        })
    }

    initSearchIndex(manifestData) {
        const { resources } = manifestData
        for( const resourceID of Object.keys(resources) ) {
            const resourceEntry = resources[resourceID]
            if( this.isIndexable(resourceEntry.type) ) {
                this.searchIndexStatus[resourceID] = 'request'
            }
        }

        // check for indexing jobs on idle
        this.checkStatusTimer = setInterval( this.indexNext, checkStatusInterval )
    }

    close() {
        clearInterval(this.checkStatusTimer)
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
                        this.indexing = false
                        // log.info(`Indexed ${resourceID}`)
                    }
                    break
                case 'resource-removed':
                    {
                        const { resourceID } = response
                        delete this.searchIndexStatus[resourceID]
                        this.checkStatus()
                        // log.info(`Removed ${resourceID}`)
                    }
                    break
                case 'search-results':
                    {
                        const { searchResults } = response
                        this.sendSearchResults(searchResults)
                    }
                    break
                default:
                    throw new Error(`Unrecognized message type: ${messageType}`)    
            }
        })

        return this.indexWorker.start({schemaJSON})
    }

    sendSearchResults( searchResults ) {
        const { resources: localResources } = this.projectStore.manifestData
        const { results } = searchResults

        // add resource entries to search results
        for( const resourceID of Object.keys(results) ) {
            const resourceEntry = localResources[resourceID]
            results[resourceID].resourceEntry = resourceEntry
            results[resourceID].parentEntry = resourceEntry.parentResource ? localResources[resourceEntry.parentResource] : null
        }
        this.projectStore.fairCopyApplication.sendToMainWindow('searchResults',searchResults) 
    }

    isIndexable(resourceType) {
        return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff' || resourceType === 'sourceDoc'
    }

    indexResource( resourceID, resourceType, content ) {
        if( this.isIndexable(resourceType ) ) {
            if( this.indexing ) {
                this.searchIndexStatus[resourceID] = 'request'
            } else {
                this.searchIndexStatus[resourceID] = 'indexing'
                this.indexing = true
                // log.info(`Starting to index ${resourceType} ${resourceID}`)
                this.indexWorker.postMessage({ messageType: 'add-resource', resourceID, resourceType, content })     
            }
            this.checkStatus()
        }
    }

    indexNext = () => {
        if( !this.indexing ) {
            const nextID = this.checkStatus()
            if( nextID ) {
                this.searchIndexStatus[nextID] = 'loading'
                this.projectStore.requestIndex(nextID)
            }    
        }
    }

    checkStatus() {
        let systemStatus = true, nextID = null
        for( const resourceID of Object.keys(this.searchIndexStatus) ) {
            const status = this.searchIndexStatus[resourceID]
            if( status !== 'ready' ) {
                systemStatus = false
            }
            if( status === 'request' ) {
                nextID = resourceID
            }
        }
        this.onStatusUpdate(systemStatus)
        return nextID
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