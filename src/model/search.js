import { scrollToNodePos } from "./scrolling"

const fairCopy = window.fairCopy

export function searchProject( searchQuery ) {
    fairCopy.services.ipcSend('searchProject', searchQuery)
}

export function highlightSearchResults(currentResource, searchQuery, searchResults) {
    const { resourceID, resourceType } = currentResource

    if( isIndexable(resourceType) ) {
        console.log(searchResults)
        const editorView = currentResource.getActiveView()
        const { tr } = editorView.state

        // highlight the results
        tr.setMeta('searchResults', searchResults)
        tr.setMeta('searchQuery', searchQuery)
        editorView.dispatch(tr)       

        // scroll to the first result        
        if( searchResults !== -1 && searchResults.length > 0 ) {
            const firstResult = searchResults[0]
            currentResource.selectedSearchHighlight = 0
            scrollToNodePos(firstResult.pos, resourceID, editorView)
        }
    }
}

export function getSearchHighlights( editorView ) {
    const plugin = editorView.state.plugins.find( plugin => plugin.key.includes('searchHighlight'))
    const pluginState = plugin.getState(editorView.state)
    const { highlights } = pluginState
    return highlights
}

export function isIndexable(resourceType) {
    return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
}
