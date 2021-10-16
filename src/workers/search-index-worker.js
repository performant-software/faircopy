import lunr from 'lunr'
import TEISchema from  '../model/TEISchema'
import TEIDocument from '../model/TEIDocument'
import { addTextNodes } from '../model/xml'

const maxIndexChunkSize = 2000

const searchIndexState = { teiSchema: null, searchIndex: {} }

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

function createIndexChunks(teiSchema, doc) {

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

function indexResource( resourceID, resourceType, content ) {
    const { teiSchema } = searchIndexState

    const indexDoc = new TEIDocument(resourceID, resourceType, null, teiSchema, false)
    indexDoc.load(content)
    const indexPMDoc = addTextNodes( indexDoc.initialState )

    const indexChunks = createIndexChunks(teiSchema,indexPMDoc)
    const searchIndex = []
    
    for( const indexChunk of indexChunks ) {
        const index = lunr( function () {
            defineLunrSchema(this,teiSchema.attrs)    
            for( const indexDoc of indexChunk ) {
                this.add(indexDoc)    
            }
        })

        // get a data only representation of the index
        searchIndex.push(index)
    }

    return searchIndex
}

function searchProject( query ) {
    const { searchIndex } = searchIndexState
    const results = {}
    if( query.length > 0 ) {
        for( const resourceID of Object.keys(searchIndex) ) {
            results[resourceID] = searchResource( query, resourceID )
        }    
    }
    return { query, results }
}

function searchResource( query, resourceID ) {
    const { searchIndex } = searchIndexState
    const resourceIndex = searchIndex[resourceID]

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

export function searchIndex( msg, workerMethods, workerData ) {
    const { messageType } = msg
    const { postMessage } = workerMethods

    if( !searchIndexState.teiSchema ) {
        const { schemaJSON } = workerData
        searchIndexState.teiSchema = new TEISchema(schemaJSON)
    }

    switch( messageType ) {
        case 'add-resource':
            {
                const { resourceID, resourceType, content } = msg
                const index = indexResource(resourceID,resourceType,content)
                searchIndexState.searchIndex[resourceID] = index
                postMessage({ messageType: 'resource-added', resourceID })
            }
            break
        case 'remove-resource':
            {
                const { resourceID } = msg
                delete searchIndexState.searchIndex[resourceID]
                postMessage({ messageType: 'resource-removed', resourceID })
            }
            break
        case 'search':
            {
                const { searchQuery } = msg
                const searchResults = searchProject(searchQuery)
                postMessage({ messageType: 'search-results', searchResults })
            }
            break
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}
