
import { animateScroll as scroll } from 'react-scroll'

const fairCopy = window.fairCopy

// offset to account for height of the toolbar above the TEI editor
const scrollTopOffset = 137

export function searchProject( searchQuery ) {
    fairCopy.services.ipcSend('searchProject', searchQuery)
}

export function highlightSearchResults(currentResource, searchQuery, searchResults) {
    const { resourceType, resourceID } = currentResource

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

function isIndexable(resourceType) {
    return resourceType === 'text' || resourceType === 'header' || resourceType === 'standOff'
}
