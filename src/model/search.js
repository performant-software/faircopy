import lunr from 'lunr';
import { animateScroll as scroll } from 'react-scroll'

const fairCopy = window.fairCopy

// offset to account for height of the toolbar above the TEI editor
const scrollTopOffset = 137

export function loadIndex( indexJSON ) {
    const rawIndices = JSON.parse(indexJSON)
    const searchIndex = {}
    for( const resourceID of Object.keys(rawIndices) ) {
        const resourceIndexRaw = rawIndices[resourceID]
        const resourceIndex = lunr.Index.load(resourceIndexRaw)
        searchIndex[resourceID] = resourceIndex
    }

    return searchIndex
}

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

export function indexDocument( fairCopyProject, resourceID, doc ) {
    const { searchIndex, teiSchema } = fairCopyProject
    const { elements, attrs } = teiSchema
    
    const resourceIndex = lunr( function () {
        defineLunrSchema(this,attrs)

        doc.descendants((node,pos) => {
            const elementName = node.type.name
            const contents = node.textContent
            const element = elements[elementName]
            if( !element ) return true

            const { fcType } = element
            const softNode = fcType === 'soft' ? 'true' : 'false'
            const attrFields = {}
            
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
                softNode,
                contents,
                ...attrFields
            })
            return true
        })

    })

    // Update resource index
    fairCopy.services.ipcSend('requestSaveIndex', resourceID, JSON.stringify(resourceIndex))
    searchIndex[resourceID] = resourceIndex
}

export function searchProject( query, searchIndex ) {
    const results = {}

    if( query.length === 0 ) return {}

    for( const resourceID of Object.keys(searchIndex) ) {
        results[resourceID] = searchResource( query, resourceID, searchIndex )
    }

    return results
}

export function searchResource( query, resourceID, searchIndex ) {
    const resourceIndex = searchIndex[resourceID]

    if( query.length === 0 ) return null

    // create a list of terms from the query
    const terms = query.split(' ')
    const termQs = []
    for( const term of terms ) {
        // filter out non-word characters
        const filteredTerm = term.replaceAll(/\W/,'')
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


export function highlightSearchResults(currentResource, searchQuery, searchResults) {
    const { resourceType, resourceID } = currentResource

    if( resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff' ) {
        const editorView = currentResource.getActiveView()
        const { tr } = editorView.state

        // highlight the results
        tr.setMeta('searchResults', searchResults)
        tr.setMeta('searchQuery', searchQuery)
        editorView.dispatch(tr)       

        // scroll to the first result        
        if( searchResults !== -1 && searchResults.length > 0 ) {
            const firstResult = searchResults[0]
            const nodeEl = editorView.nodeDOM(firstResult) 
            if( nodeEl ) {
                const { top } = nodeEl.getBoundingClientRect()
                const containerEl = editorView.dom.parentNode.parentNode
                const scrollTargetPx = top + containerEl.scrollTop - scrollTopOffset
                scroll.scrollTo( scrollTargetPx, { containerId: resourceID } )  
            }
        }
    }    
}


// const sampleDocs = [
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/1',
//         elementName: "body",
//         contents: "This is my textNode's deleted content.\nRabbit is the second paragraph."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/2',
//         attr_xmlID: "foo",
//         contents: "This is my textNode's deleted content.\nThis is the second paragraph."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/10',
//         elementName: "p",
//         softNode: "true",
//         attr_rend: "bold",
//         contents: "This is my textNode's rabbit deleted content."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/20',    
//         elementName: "pb",
//         attr_facs: "pics#101"
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/30',   
//         elementName: "note",
//         softNode: "true",
//         contents: "This is my note."
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/40',  
//         elementName: "del",
//         attr_place: "above",
//         contents: "deleted"
//     },
//     {
//         locator: 'sdsds-dsdsd-dsdsd-dsds/50', 
//         elementName: "p",
//         contents: "This is the second  rabbit paragraph."
//     }
// ]
