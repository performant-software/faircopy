const { workerData, parentPort } = require('worker_threads')
const lunr = require('lunr')
const { Node } = require('prosemirror-model')
const { TEISchema } = require('../TEISchema')

const maxIndexChunkSize = 2000

function getSafeAttrKey( attrName ) {
    return attrName.replace(':','')
}

function defineAttrFields( lunrIndex, attrs ) {
    for( const attr of Object.keys(attrs) ) {
        const attrSafeKey = getSafeAttrKey(attr)
        const fieldName = `attr_${attrSafeKey}`
        lunrIndex.field(fieldName)
    }
}

function defineLunrSchema( lunrIndex, attrs ) {
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
    defineAttrFields( lunrIndex, attrs )
}

function createIndexChunks(teiSchema, contentJSON) {

    const doc = Node.fromJSON(teiSchema.schema, contentJSON)

    let indexChunk = []
    const indexChunks = [ indexChunk ]

    doc.descendants((node,pos) => {

        // if this chunk is full, create a new chunk
        if( indexChunk.length > maxIndexChunkSize ) {
            indexChunk = []
            indexChunks.push(indexChunk)
        }
        
        const elementName = node.type.name
        const {nodeSize} = node
        const element = teiSchema.elements[elementName]
        if( !element ) return false

        const { fcType } = element
        const softNode = fcType === 'soft' 
        const attrFields = {}
        const contents = softNode ? node.textContent : null
        
        for( const attrKey of Object.keys(node.attrs) ) {
            const attrVal = node.attrs[attrKey]
            const attrSafeKey = getSafeAttrKey(attrKey)
            attrFields[`attr_${attrSafeKey}`] = attrVal
        }

        // TODO index marks
        // TODO sub docs

        indexChunk.push({
            pos,
            elementName,
            softNode: softNode ? 'true' : 'false',
            contents,
            nodeSize,
            ...attrFields
        })
        return !softNode
    })

    return indexChunks
}

function indexResource(schemaJSON, contentJSON) {
    const teiSchema = new TEISchema(schemaJSON)
    const indexChunks = createIndexChunks(teiSchema,contentJSON)
    const indexJSONs = []
    
    for( const indexChunk of indexChunks ) {
        const index = lunr( function () {
            defineLunrSchema(this,teiSchema.attrs)    
            for( const indexDoc of indexChunk ) {
                this.add(indexDoc)    
            }
        })

        // get a data only representation of the index
        const indexJSON = JSON.stringify(index)         
        indexJSONs.push(indexJSON)
    }

    return `[${indexJSONs.join(',')}]`
}

function run() {
    const { schemaJSON } = workerData

    parentPort.on('message', (msg) => {
        const { resourceID, contentJSON } = msg
        const resourceIndex = indexResource( schemaJSON, contentJSON )
        parentPort.postMessage({ resourceID, resourceIndex })
    })
}

// RUN THREAD /////////////////
run()