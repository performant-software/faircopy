
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
