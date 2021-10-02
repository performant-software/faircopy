const lunr = require('lunr')
const { TEISchema } = require('./TEISchema')
const { Node } = require('prosemirror-model')

class SearchIndex {

    constructor( schemaJSON, projectStore, onReady ) {
        this.projectStore = projectStore
        this.teiSchema = new TEISchema(schemaJSON)
        this.onReady = onReady
        this.searchIndex = {}
        this.searchIndexStatus = {} 
    }

    initSearchIndex(manifestData) {
        const { resources } = manifestData
        for( const resourceID of Object.keys(resources) ) {
            const resourceEntry = resources[resourceID]
            if( this.isIndexable(resourceEntry.type) ) {
                this.searchIndexStatus[resourceID] = 'loading'
                this.loadIndex(resourceID)
            }
        }    
    }

    async loadIndex(resourceID) {
        const indexJSON = await this.projectStore.loadSearchIndex( resourceID )
        if( indexJSON ) {
            const rawIndex = JSON.parse(indexJSON)
            this.searchIndex[resourceID] = lunr.Index.load(rawIndex)
            this.searchIndexStatus[resourceID] = 'ready'    
        } else {
            this.searchIndexStatus[resourceID] = 'not-found'  
        }
        if( this.isSearchReady() ) this.onReady()
    }

    isIndexable(resourceType) {
        return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
    }

    getSafeAttrKey( attrName ) {
        return attrName.replace(':','')
    }
    
    defineAttrFields( lunrIndex, attrs ) {
        for( const attr of Object.keys(attrs) ) {
            const attrSafeKey = this.getSafeAttrKey(attr)
            const fieldName = `attr_${attrSafeKey}`
            lunrIndex.field(fieldName)
        }
    }
    
    defineLunrSchema( lunrIndex, attrs ) {
        // configure pipeline for exact matching search, language independent
        lunrIndex.pipeline.remove(lunr.stemmer)
        lunrIndex.pipeline.remove(lunr.stopWordFilter)
        lunrIndex.searchPipeline.remove(lunr.stemmer)
        lunrIndex.searchPipeline.remove(lunr.stopWordFilter)
    
        // add fields to schema
        lunrIndex.ref('pos')
        lunrIndex.field('elementName')
        lunrIndex.field('softNode')
        lunrIndex.field('contents')
        this.defineAttrFields( lunrIndex, attrs )
    }
    
    indexResource( resourceID, contentJSON ) {
        const doc = Node.fromJSON(this.teiSchema.schema, contentJSON)

        const searchIndex = this

        const resourceIndex = lunr( function () {
            const { teiSchema } = searchIndex
            searchIndex.defineLunrSchema(this,teiSchema.attrs)
    
            doc.descendants((node,pos) => {
                const elementName = node.type.name
                const contents = node.textContent
                const element = teiSchema.elements[elementName]
                if( !element ) return true
    
                const { fcType } = element
                const softNode = fcType === 'soft' ? 'true' : 'false'
                const attrFields = {}
                
                for( const attrKey of Object.keys(node.attrs) ) {
                    const attrVal = node.attrs[attrKey]
                    const attrSafeKey = searchIndex.getSafeAttrKey(attrKey)
                    attrFields[`attr_${attrSafeKey}`] = attrVal
                }
    
                // TODO index marks
                // TODO sub docs
    
                this.add({
                    pos,
                    elementName,
                    softNode,
                    contents,
                    ...attrFields
                })
                return true
            })
    
        })
    
        // Update resource index
        this.searchIndex[resourceID] = resourceIndex

        // Store it in the project store
        this.projectStore.saveIndex( resourceID, JSON.stringify(resourceIndex) )
        this.searchIndexStatus[resourceID] = 'ready'

        // Fire callback when all documents are is ready
        if( this.isSearchReady() ) this.onReady()
    }

    isSearchReady() {
        for( const status of Object.values(this.searchIndexStatus) ) {
            if( status !== 'ready' ) return false
        }
        return true
    }

    removeIndex(resourceID) {
        delete this.searchIndex[resourceID]
        delete this.searchIndexStatus[resourceID]
    }

    searchProject( query ) {
        const results = {}
        if( !this.isSearchReady() ) return {}
    
        if( query.length === 0 ) return {}
    
        for( const resourceID of Object.keys(this.searchIndex) ) {
            results[resourceID] = this.searchResource( query, resourceID )
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

exports.SearchIndex = SearchIndex