const { workerData, parentPort } = require('worker_threads')
const lunr = require('lunr')
const { Node } = require('prosemirror-model')
const { TEISchema } = require('./TEISchema')

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

function indexResource(schemaJSON, contentJSON) {
    const teiSchema = new TEISchema(schemaJSON)
    const doc = Node.fromJSON(teiSchema.schema, contentJSON)
    
    const resourceIndex = lunr( function () {
        defineLunrSchema(this,teiSchema.attrs)
    
        doc.descendants((node,pos) => {
            const elementName = node.type.name
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
    
            this.add({
                pos,
                elementName,
                softNode: softNode ? 'true' : 'false',
                contents,
                ...attrFields
            })
            return !softNode
        })
    
    })

    // get a data only representation of the index
    const indexJSON = JSON.stringify(resourceIndex)
    return JSON.parse(indexJSON)
}

function run() {
    const { schemaJSON } = workerData

    parentPort.on('message', (msg) => {
        const { resourceID, contentJSON } = msg
        const rawIndex = indexResource( schemaJSON, contentJSON )
        parentPort.postMessage({ resourceID, rawIndex })
    })
}

// RUN THREAD /////////////////
run()