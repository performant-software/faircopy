import { Document } from "flexsearch";
import TEISchema from  '../model/TEISchema'
import TEIDocument from '../model/TEIDocument'
import { addTextNodes } from '../model/xml'

const searchIndexState = { teiSchema: null, searchIndex: {}, resourceMap: {} }

function getSafeAttrKey( attrName ) {
    return attrName.replace(':','')
}

function defineAttrFields( attrs ) {
    const attrFields = []
    for( const attr of Object.keys(attrs) ) {
        const attrSafeKey = getSafeAttrKey(attr)
        const fieldName = `attr_${attrSafeKey}`
        attrFields.push(fieldName)
    }
    return attrFields
}

function createIndexDocs(teiSchema, doc) {

    const resourceMap = [], indexDocs = []
    let i=0

    doc.descendants((node,pos) => {        
        const elementName = node.type.name
        const {nodeSize} = node
        const element = teiSchema.elements[elementName]
        if( !element ) return false

        const { fcType } = element
        const softNode = fcType === 'soft' || fcType === 'inters'
        const attrFields = {}
        const contents = node.textContent
        
        for( const attrKey of Object.keys(node.attrs) ) {
            const attrVal = node.attrs[attrKey]
            const attrSafeKey = getSafeAttrKey(attrKey)
            attrFields[`attr_${attrSafeKey}`] = attrVal
        }

        // TODO index marks
        // TODO sub docs
        const id = i++

        resourceMap.push({
            elementName,
            pos,
            softNode,
            nodeSize
        })

        indexDocs.push({
            id,
            contents,
            ...attrFields
        })
        return !softNode
    })

    return { resourceMap, indexDocs }
}

function indexResource( resourceID, resourceType, content ) {
    const { teiSchema } = searchIndexState

    const indexDoc = new TEIDocument(resourceID, resourceType, null, teiSchema, false)
    indexDoc.load(content)
    const indexPMDoc = addTextNodes( indexDoc.initialState )

    const { resourceMap, indexDocs } = createIndexDocs(teiSchema,indexPMDoc)

    const attrFields = defineAttrFields( teiSchema.attrs )

    const flexSearchIndex = new Document({
        document: { 
            id: "id",
            index: ["contents", ...attrFields]
        } 
    })

    for( const indexDoc of indexDocs ) {
        flexSearchIndex.add(indexDoc)        
    }

    return { resourceMap, flexSearchIndex }
}

function searchProject( query ) {
    const { searchIndex } = searchIndexState
    const results = {}
    for( const resourceID of Object.keys(searchIndex) ) {
        results[resourceID] = searchResource( query, resourceID )
    }    
    return { query: query.query, results }
}

function searchResource( searchQuery, resourceID ) {
    const { searchIndex, resourceMap } = searchIndexState
    const resourceIndex = searchIndex[resourceID]
    const elementMap = resourceMap[resourceID]
    const { query, elementName, attrQs } = searchQuery 

    let searchResults = []
    const bodyTextResults = resourceIndex.search(query,["contents"])

    if( bodyTextResults.length > 0 ) {
        const { result: mapIDs } = bodyTextResults[0]
        
        if( elementName ) {
            const elementMatchIDs = mapIDs.filter( i => elementMap[i].elementName === elementName )
            for( const elementID of elementMatchIDs ) {
                const { pos:start, nodeSize } = elementMap[elementID]
                const end = start + nodeSize
                for( const id of mapIDs ) {
                    const mapEntry = elementMap[id]
                    const { pos, softNode } = mapEntry
                    if( softNode && pos >= start && pos < end ) {
                        searchResults.push(pos)
                    }
                }
            }    
        } else {
            for( const id of mapIDs ) {
                const mapEntry = elementMap[id]
                const { pos, softNode } = mapEntry
                if( softNode ) {
                    searchResults.push(pos)
                }
            }
        }
    }

    // next, search for the attributes
    let attrResults = []
    for( const attrQ of attrQs ) {
        const { name, value } = attrQ
        const attrSafeKey = getSafeAttrKey(name)
        const attrResponse = resourceIndex.search(value,[`attr_${attrSafeKey}`])

        if( attrResponse.length > 0 ) {
            const { result: mapIDs } = attrResponse[0]
            for( const mapID of mapIDs ) {
                const {pos} = elementMap[mapID]
                attrResults.push(pos)
            }
        }
    }

    // filter search results by matching attrQ results
    if( attrQs.length > 0 ) {
        searchResults = searchResults.filter( searchResult => attrResults.includes(searchResult) )
    }
        
    return searchResults
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
                const { resourceMap, flexSearchIndex } = indexResource(resourceID,resourceType,content)
                searchIndexState.resourceMap[resourceID] = resourceMap
                searchIndexState.searchIndex[resourceID] = flexSearchIndex
                postMessage({ messageType: 'resource-added', resourceID })
            }
            break
        case 'remove-resource':
            {
                const { resourceID } = msg
                delete searchIndexState.resourceMap[resourceID]
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
