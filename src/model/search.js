import { scrollToNodePos } from "./scrolling"

const fairCopy = window.fairCopy

export function searchProject( searchQuery ) {
    fairCopy.services.ipcSend('searchProject', searchQuery)
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
        scrollToNodePos(parentPos, currentResource.resourceID, editorView)    
    }
}