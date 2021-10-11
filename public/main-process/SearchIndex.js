const { Worker } = require('worker_threads')
const lunr = require('lunr')
const log = require('electron-log')

// keep CPU down during indexing
const delayBetweenIndexing = 2000

class SearchIndex {

    constructor( schemaJSON, projectStore, onStatusUpdate ) {
        this.projectStore = projectStore
        this.onStatusUpdate = onStatusUpdate
        this.searchIndex = {}
        this.searchIndexStatus = {} 
        this.indexWorker = this.initIndexWorker(schemaJSON)
        this.bigJSONWorker = this.initBigJSONWorker()
        this.indexingQueue = []
        this.indexing = false
        this.paused = false
    }

    initSearchIndex(manifestData) {
        const { resources } = manifestData
        for( const resourceID of Object.keys(resources) ) {
            const resourceEntry = resources[resourceID]
            if( this.isIndexable(resourceEntry.type) ) {
                this.searchIndexStatus[resourceID] = 'loading'
                this.projectStore.loadSearchIndex(resourceID)
            }
        }    
    }

    close() {
        if( this.indexWorker ) this.indexWorker.terminate()
        this.bigJSONWorker.terminate()
    }

    initIndexWorker(schemaJSON) {
        const indexWorker = new Worker('./public/main-process/search-index-worker.js', { workerData: { schemaJSON } })

        indexWorker.on('message', (response) => {
            // get finished index back from worker thread
            const { resourceID, resourceIndex } = response
            this.indexing = false

            this.loadIndex(resourceID,resourceIndex)
            this.projectStore.saveIndex( resourceID, resourceIndex )

            const itemsRemaining = this.indexingQueue.length
            if( itemsRemaining > 0 ) {
                if( itemsRemaining % 10 === 0 ) this.projectStore.save()
                setTimeout(()=> {
                    const { resourceID, contentJSON } = this.indexingQueue.pop()
                    this.indexResource( resourceID, contentJSON )
                }, delayBetweenIndexing)
            } else {
                // nothing in queue, land it
                this.projectStore.save()
            }
        })

        indexWorker.on('error', function(e) { 
            log.error(e)
            throw new Error(e)
        })

        indexWorker.on('exit', function(e) { 
            log.info('Exited search index worker.')
        })

        return indexWorker
    }

    initBigJSONWorker() {
        const bigJSONWorker = new Worker('./public/main-process/big-json-worker.js')

        bigJSONWorker.on('message', (msg) => {
            const {messageType, resourceID, respData } = msg

            switch(messageType) {
                case 'json':
                    const resourceIndex = respData.map( indexChunk => lunr.Index.load(indexChunk) )
                    this.searchIndex[resourceID] = resourceIndex
                    this.searchIndexStatus[resourceID] = 'ready'    
                    this.checkStatus() 
                    break
                default:
                    throw new Error(`Unrecognized message type: ${messageType}`)
            }
        })

        bigJSONWorker.on('exit', () => log.info('Big JSON worker thread terminated.'))

        return bigJSONWorker
    }
    
    async loadIndex(resourceID,indexJSON) {
        if( indexJSON ) {
            this.bigJSONWorker.postMessage({ command: 'parse', resourceID, data: indexJSON })
        } else {
            this.searchIndexStatus[resourceID] = 'not-found'  
            this.checkStatus() 
        }
    }

    isIndexable(resourceType) {
        return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
    }

    indexResource( resourceID, contentJSON ) {
        if( this.paused ) {
            this.indexingQueue.push({resourceID, contentJSON})
        } else {
            if( !this.indexing ) {
                this.indexing = true
                log.info(`indexing: ${resourceID}`)
                this.indexWorker.postMessage({ resourceID, contentJSON })    
            } else {
                log.info(`queued for indexing: ${resourceID}`)
                this.indexingQueue.push({resourceID, contentJSON})
            }    
        }
    }

    pauseIndexing( pause ) {
        this.paused = pause
        if( !pause && this.indexingQueue.length > 0 ) {
            const { resourceID, contentJSON } = this.indexingQueue.pop()
            this.indexResource( resourceID, contentJSON )
        } 
        this.checkStatus()
    }

    checkStatus() {
        const notReady = { ready: false }

        if( this.indexingQueue.length > 0 ) {
            this.onStatusUpdate(notReady)     
            return false
        }

        let notFound = []
        for( const resourceID of Object.keys(this.searchIndexStatus) ) {
            const status = this.searchIndexStatus[resourceID]
            if( status === 'loading' ) {
                this.onStatusUpdate(notReady)     
                return false
            }
            if( status === 'not-found' ) notFound.push(resourceID)
        }
        this.onStatusUpdate({ ready: (notFound.length === 0), notFound })
        return true
    }

    removeIndex(resourceID) {
        delete this.searchIndex[resourceID]
        delete this.searchIndexStatus[resourceID]
    }

    searchProject( query ) {
        const results = {}
        if( this.checkStatus() && query.length > 0 ) {
            for( const resourceID of Object.keys(this.searchIndex) ) {
                results[resourceID] = this.searchResource( query, resourceID )
            }    
        }
        return { query, results }
    }
    
    searchResource( query, resourceID ) {
        const resourceIndex = this.searchIndex[resourceID]
    
        if( query.length === 0 ) return null
    
        // create a list of terms from the query
        const terms = query.split(' ')
        const termQs = []
        for( const term of terms ) {
            // filter out non-word characters
            const filteredTerm = term.replaceAll(/\W/g,'')
            termQs.push(`+contents:${filteredTerm}`)
        }
        const termQ = termQs.join(' ')

        // The index is divided into chunks for performance reasons. 
        // Large docs or too many docs in an index cause performance issues.
        let results = []
        for( const indexChunk of resourceIndex ) {
            // full text search 
            const lunrResults = indexChunk.search(`+softNode:true ${termQ}`)
            results = results.concat( lunrResults.map( (result) => parseInt(result.ref) ) )
        }
        return results.sort((a, b) => a - b )
    
        // TODO find a element containing a phrase w/certain attrs
        // const results = searchIndex.search('+contents:this +contents:is +elementName:p +attr_rend:bold')
    }

}

exports.SearchIndex = SearchIndex