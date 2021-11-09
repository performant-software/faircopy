import { Document } from "flexsearch";
import TEISchema from  '../model/TEISchema'
import TEIDocument from '../model/TEIDocument'
import { addTextNodes } from '../model/xml'
import { gatherMarkSets } from "../model/commands";

// this is per index
const maxSearchResults = 1000

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

    const markPrefix = 'mark'
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
        const contents = doc.textBetween(pos, pos+nodeSize-2, ' ', ' ')

        for( const attrKey of Object.keys(node.attrs) ) {
            const attrVal = node.attrs[attrKey]
            const attrSafeKey = getSafeAttrKey(attrKey)
            attrFields[`attr_${attrSafeKey}`] = attrVal
        }

        resourceMap.push({
            elementType: softNode ? 'softNode' : 'hardNode',
            elementName,
            pos,
            nodeSize
        })

        indexDocs.push({
            id: i++,
            contents,
            ...attrFields
        })

        // index marks within soft nodes
        if( softNode ) {
            const markSets = gatherMarkSets(node)
            
            for( const markSet of markSets ) {
                const { marks, text } = markSet
                for( const mark of marks ) {
                    const markName = mark.type.name
                    const elementName = markName.startsWith(markPrefix) ? markName.slice(markPrefix.length) : markName
        
                    resourceMap.push({
                        elementType: 'mark',
                        elementName,
                        pos,
                        nodeSize
                    })
            
                    const markAttrFields = {}
        
                    for( const attrKey of Object.keys(mark.attrs) ) {
                        const attrVal = mark.attrs[attrKey]
                        const attrSafeKey = getSafeAttrKey(attrKey)
                        markAttrFields[`attr_${attrSafeKey}`] = attrVal
                    }
        
                    indexDocs.push({
                        id: i++,
                        contents: text,
                        ...markAttrFields
                    })
                }
            }

            // TODO index inline nodes
        }

        // don't descend into soft nodes
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
    /// TODO index subdocs

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
    return { query, results }
}

function searchResource( searchQuery, resourceID ) {
    const { searchIndex, resourceMap } = searchIndexState
    const resourceIndex = searchIndex[resourceID]
    const elementMap = resourceMap[resourceID]
    const { query, elementName, attrQs } = searchQuery 

    let searchResults = []
    const bodyTextResults = resourceIndex.search(query,{
        index: ["contents"],
        limit: maxSearchResults
    })

    if( bodyTextResults.length > 0 ) {
        const { result: mapIDs } = bodyTextResults[0]
        
        if( elementName.length > 0 ) {
            const elementMatchIDs = mapIDs.filter( i => elementMap[i].elementName === elementName )
            for( const elementID of elementMatchIDs ) {
                const { pos, elementType } = elementMap[elementID]
                searchResults.push({ pos, elementType })
            }    
        } else {
            for( const elementID of mapIDs ) {
                const { pos, elementType } = elementMap[elementID]
                // don't return hard nodes if there's no elementName or attrQs in the query
                if( attrQs.length === 0 ) {
                    if( elementType !== 'hardNode' ) searchResults.push({ pos, elementType })
                } else {
                    searchResults.push({ pos, elementType })
                }                
            }
        }
    }

    // next, search for the attributes
    let attrMatches = {}
    for( const attrQ of attrQs ) {
        const { name, value } = attrQ
        const attrSafeKey = getSafeAttrKey(name)
        const attrResponse = resourceIndex.search(value,{
            index: [`attr_${attrSafeKey}`],
            limit: maxSearchResults
        })
        if( attrResponse.length > 0 ) {
            const { result: mapIDs } = attrResponse[0]
            for( const mapID of mapIDs ) {
                const {pos} = elementMap[mapID]
                const key = `${name}-${value}`
                if( attrMatches[key] ) {
                    attrMatches[key].push(pos)
                } else {
                    attrMatches[key] = [ pos ]
                }
            }
        }
    }
    
    // filter search results by matching attrQ results
    if( attrQs.length > 0 ) {
        const attrResults = []
        for( const searchResult of searchResults ) {
            let found = null
            for( const attrMatchList of Object.values(attrMatches) ) {
                if( attrMatchList.includes( searchResult.pos ) ) {
                    if( found === null ) found = true
                } else {
                    found = false
                }
            }    
            if( found ) {
                // found for all attrQs
                attrResults.push( searchResult )
            }
        }
        searchResults = attrResults
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
