import TEIDocument from "./TEIDocument"
import { scrollToNodePos } from "./scrolling"
import { TextSelection } from "prosemirror-state"

const fairCopy = window.fairCopy

export function searchProject( searchQuery ) {
    fairCopy.ipcSend('searchProject', searchQuery)
}

export function searchResource( resource, searchQuery ) {
    if( resource instanceof TEIDocument ) {
        // search the document for the nodes that match the search query
        const docSearchResults = [] 

        const { query, attrQs } = searchQuery
        let elementNameQ = searchQuery.elementName?.toLowerCase().trim()
        elementNameQ = elementNameQ === '' ? null : elementNameQ
        const queryLowerCase = query.toLowerCase()
        const { editorView } = resource
        const editorState = editorView.state
        const { doc } = editorState
        const teiSchema = resource.getTEISchema()

        // Find the deepest nodes in the tree that contain one or more terms
        // eslint-disable-next-line no-loop-func
        doc.descendants( (node,pos) => {
            const elementName = node.type.name
            const element = teiSchema.elements[elementName]
            if( element ) {
                // don't return nodes that don't match the elementName in the query
                if( elementNameQ && elementName.toLowerCase() !== elementNameQ ) return true
                
                // dont return nodes that don't match the attrQs in the query
                if( attrQs.length > 0 ) {
                    const attrs = node.attrs
                    const attrMatches = attrQs.map( attrQ => {
                        const { name, value } = attrQ
                        const attrValue = attrs[name]
                        if( attrValue && attrValue === value ) return true
                        return false
                    })
                    if( !attrMatches.every( match => match === true ) ) return true
                }
                const text = node.textContent.toLowerCase()
                const { fcType } = element
                const elementType = fcType === 'soft' || fcType === 'inters' ? 'softNode' : 'hardNode'     
                if( text.includes(queryLowerCase) ) {
                    // don't return hard nodes if there's no elementName or attrQs in the query
                    if( elementNameQ || attrQs.length > 0 ) {
                        docSearchResults.push({ pos, elementType })
                        return false
                    } else {
                        if( elementType !== 'hardNode' ) {
                            docSearchResults.push({ pos, elementType })
                            return false
                        } 
                        return true
                    }                       
                }
            }
            return true
        })
        
        // return the results in the same format as searchProject()
        const results = {}
        const { resourceEntry } = resource
        results[resourceEntry.id] = docSearchResults
        results[resourceEntry.id].resourceEntry = resourceEntry
        results[resourceEntry.id].parentEntry = resourceEntry.parentResource ? resource.parentEntry : null
        return {
            query: searchQuery,
            results
        }
    } else {
        return { query: searchQuery, results: {} }
    }
}

export function highlightSearchResults(currentResource, searchQuery, searchResults) {
    const { resourceType } = currentResource

    if( isIndexable(resourceType) ) {
        const editorView = currentResource.getActiveView()
        const { tr } = editorView.state

        // highlight the results
        tr.setMeta('searchResults', searchResults)
        tr.setMeta('searchQuery', searchQuery)
        tr.setMeta('selectionIndex', 0)
        editorView.dispatch(tr)       
    }
}

export function setSelectionIndex( selectionIndex, editorView ) {
    const { tr } = editorView.state
    tr.setMeta('selectionIndex', selectionIndex)
    editorView.dispatch(tr)       
}

export function getSelectionIndex( editorView ) {
    const plugin = editorView.state.plugins.find( plugin => plugin.key.includes('searchHighlight'))
    const pluginState = plugin.getState(editorView.state)
    const { selectionIndex } = pluginState
    return selectionIndex
}

export function getSearchHighlights( editorView ) {
    const plugin = editorView.state.plugins.find( plugin => plugin.key.includes('searchHighlight'))
    const pluginState = plugin.getState(editorView.state)
    const { highlights } = pluginState
    return highlights
}

export function isIndexable(resourceType) {
    return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff' || resourceType === 'sourceDoc'
}

export function scrollToSearchResult( currentResource, searchResultIndex ) {
    const editorView = currentResource.getActiveView()
    const highlights = getSearchHighlights( editorView ) 

    const nextHighlight = highlights[searchResultIndex]
    if( nextHighlight ) {
        const {doc} = editorView.state
        const $pos = doc.resolve( nextHighlight.from )
        const parentPos = $pos.pos - $pos.parentOffset - 1
        scrollToNodePos(parentPos, currentResource.resourceID, editorView, true)    
        let tr = editorView.state.tr
        tr.setSelection( new TextSelection($pos) )
        editorView.dispatch(tr)
    }
}