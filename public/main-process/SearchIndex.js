const { Worker } = require('worker_threads')
const lunr = require('lunr')
const log = require('electron-log')

// throttle max number of workers and polling frequency
const maxIndexWorkers = 1
const workerCompletePoll = 400

class SearchIndex {

    constructor( schemaJSON, projectStore, onReady ) {
        this.projectStore = projectStore
        this.onReady = onReady
        this.searchIndex = {}
        this.searchIndexStatus = {} 
        this.jsonWorkersRunning = 0
        this.indexWorker = this.initIndexWorker(schemaJSON)
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

    initIndexWorker(schemaJSON) {
        const indexWorker = new Worker('./public/main-process/search-index-worker.js', { workerData: { schemaJSON } })

        indexWorker.on('message', (response) => {
            // get finished index back from worker thread
            const { resourceID, rawIndex } = response

            // Update resource index
            this.searchIndex[resourceID] = lunr.Index.load(rawIndex)    
            this.transformJSON('stringify', rawIndex ).then( (resp) => {
                const { respData } = resp
                this.projectStore.saveIndex( resourceID, respData )
            })
            this.searchIndexStatus[resourceID] = 'ready'

            // Fire callback when all documents are loaded
            const status = this.checkStatus() 
            if( status.ready ) this.onReady(status) 
        })

        indexWorker.on('error', function(e) { 
            log.error(e)
            throw new Error(e)
        })

        return indexWorker
    }
    
    async loadIndex(resourceID,indexJSON) {
        if( indexJSON ) {
            const { respData } = await this.transformJSON('parse',indexJSON)
            this.searchIndex[resourceID] = lunr.Index.load(respData)
            this.searchIndexStatus[resourceID] = 'ready'    
        } else {
            this.searchIndexStatus[resourceID] = 'not-found'  
        }
        const status = this.checkStatus() 
        if( status.ready ) this.onReady(status) 
    }

    async transformJSON( mode, data) {
        const workerData = { mode, data }

        while( true ) {
            if( this.jsonWorkersRunning < maxIndexWorkers ) {
                this.jsonWorkersRunning++
                const resp = await this.runJSONWorker(workerData)
                this.jsonWorkersRunning--
                return resp
            } else {
                await wait( workerCompletePoll )
            }
        }
    }

    async runJSONWorker(workerData) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./public/main-process/big-json-worker.js', { workerData })
            worker.on('message', resolve)
            worker.on('error', reject)    
        })
    }

    isIndexable(resourceType) {
        return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
    }

    indexResource( resourceID, contentJSON ) {
        this.indexWorker.postMessage({ resourceID, contentJSON })
    }

    checkStatus() {
        let notFound = []
        for( const resourceID of Object.keys(this.searchIndexStatus) ) {
            const status = this.searchIndexStatus[resourceID]
            if( status === 'loading' ) return { ready: false }
            if( status === 'not-found' ) notFound.push(resourceID)
        }
        return {
            ready: true,
            notFound
        }
    }

    removeIndex(resourceID) {
        delete this.searchIndex[resourceID]
        delete this.searchIndexStatus[resourceID]
    }

    searchProject( query ) {
        const results = {}
        if( this.checkStatus().ready && query.length > 0 ) {
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
    
        // full text search 
        const lunrResults = resourceIndex.search(`+softNode:true ${termQ}`)
        const results = lunrResults.map( (result) => parseInt(result.ref) )
        return results.sort((a, b) => a - b )
    
        // TODO find a element containing a phrase w/certain attrs
        // const results = searchIndex.search('+contents:this +contents:is +elementName:p +attr_rend:bold')
    }

}

function wait(time) { 
    return new Promise(resolve => setTimeout(resolve, time))
}

exports.SearchIndex = SearchIndex