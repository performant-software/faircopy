import { animateScroll as scroll } from 'react-scroll'

// offset to account for height of the toolbar above the TEI editor
const scrollTopOffset = 137

// scroll to this position in the document
export function scrollToNodePos(nodePos, resourceID, editorView) {
    let nodeEl = editorView.nodeDOM(nodePos) 
    if( nodeEl ) {
        if( nodeEl.nodeName === '#text' ) {
            nodeEl = nodeEl.parentNode
        }
        const { top } = nodeEl.getBoundingClientRect()
        const containerEl = editorView.dom.parentNode.parentNode
        const scrollTargetPx = top + containerEl.scrollTop - scrollTopOffset
        scroll.scrollTo( scrollTargetPx, { containerId: resourceID } )  
    }
}