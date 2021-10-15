const { WorkerWindow } = require('./WorkerWindow')
const lunr = require('lunr')
const log = require('electron-log')

// keep CPU down during indexing
const delayBetweenIndexing = 250

class SearchIndex {

    constructor( schemaJSON, projectStore, onStatusUpdate ) {
        this.projectStore = projectStore
        this.onStatusUpdate = onStatusUpdate
        this.searchIndex = {}
        this.searchIndexStatus = {} 
        this.indexingQueue = []
        this.indexing = false
        this.paused = false

        const {baseDir} = this.projectStore.fairCopyApplication
        const debug = this.projectStore.fairCopyApplication.isDebugMode()
        this.initBigJSONWorker(baseDir,debug).then(() => {
            this.initIndexWorker(baseDir,debug,schemaJSON).then(() => {
                this.initSearchIndex( this.projectStore.manifestData )                
            })
        })
    }

    initSearchIndex(manifestData) {
        const { resources } = manifestData
        let delay = delayBetweenIndexing
        for( const resourceID of Object.keys(resources) ) {
            const resourceEntry = resources[resourceID]
            if( this.isIndexable(resourceEntry.type) ) {
                this.searchIndexStatus[resourceID] = 'loading'
                // space out the loading of data for CPU
                setTimeout( () => {
                    this.projectStore.loadSearchIndex(resourceID)
                }, delay)
                delay += delayBetweenIndexing
            }
        }    
    }

    close() {
        this.indexWorker.close()
        this.bigJSONWorker.close()
    }

    initIndexWorker(baseDir,debug,schemaJSON) {        
        this.indexWorker = new WorkerWindow( baseDir, debug, 'search-index', (response) => {
            // get finished index back from worker thread
            const { resourceID, resourceIndex } = response

            this.loadIndex(resourceID,resourceIndex)
            this.projectStore.saveIndex( resourceID, resourceIndex )

            const itemsRemaining = this.indexingQueue.length
            if( itemsRemaining > 0 ) {
                if( itemsRemaining % 10 === 0 ) this.projectStore.save()
                setTimeout(()=> {
                    // make sure the list is still there
                    if( this.indexingQueue.length > 0 ) {
                        const { resourceID, contentJSON } = this.indexingQueue.pop()
                        this.indexing = false
                        this.indexResource( resourceID, contentJSON )    
                    }
                }, delayBetweenIndexing)
            } else {
                // nothing in queue, land it
                this.projectStore.save()
            }
        })

        return this.indexWorker.start({schemaJSON})
    }

    initBigJSONWorker(baseDir,debug) {
        this.bigJSONWorker = new WorkerWindow( baseDir, debug, 'big-json', (msg) => {
            const {messageType, resourceID, respData } = msg

            switch(messageType) {
                case 'json':
                    log.info(`loaded index ${resourceID}.`)
                    const resourceIndex = respData.map( indexChunk => lunr.Index.load(indexChunk) )
                    this.searchIndex[resourceID] = resourceIndex
                    this.searchIndexStatus[resourceID] = 'ready'    
                    this.checkStatus() 
                    break
                default:
                    throw new Error(`Unrecognized message type: ${messageType}`)
            }
        })

        return this.bigJSONWorker.start()
    }
    
    loadIndex(resourceID,indexJSON) {
        if( indexJSON ) {
            this.bigJSONWorker.postMessage({ command: 'parse', resourceID, data: indexJSON })
        } else {
            this.searchIndexStatus[resourceID] = 'not-found'
            this.projectStore.requestIndex(resourceID)
            this.checkStatus() 
        }
    }

    isIndexable(resourceType) {
        return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
    }

    indexResource( resourceID, contentJSON ) {
        if( this.paused ) {
            log.info(`paused, queue for indexing: ${resourceID}`)
            this.indexingQueue.push({resourceID, contentJSON})
        } else {
            if( !this.indexing ) {
                this.indexing = true
                log.info(`indexing: ${resourceID}`)
                this.indexWorker.postMessage({ resourceID, contentJSON })    
            } else {
                log.info(`busy, queue for indexing: ${resourceID}`)
                this.indexingQueue.push({resourceID, contentJSON})
            }    
        }
    }

    pauseIndexing( pause ) {
        this.paused = pause
        if( !pause && this.indexingQueue.length > 0 ) {
            log.info('Resuming indexing...')
            this.indexing = false
            const { resourceID, contentJSON } = this.indexingQueue.pop()
            this.indexResource( resourceID, contentJSON )
        } 
        if( pause ) {            
            log.info('Pausing indexing...')
            this.onStatusUpdate(false)     
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
        delete this.searchIndex[resourceID]
        delete this.searchIndexStatus[resourceID]
        const doomedIndex = this.indexingQueue.findIndex( job => job.resourceID === resourceID )
        if( doomedIndex !== -1 ) {
            this.indexingQueue.splice(doomedIndex,1)
        }
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