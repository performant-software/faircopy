import { NodeSelection, TextSelection } from 'prosemirror-state'

export function navigateTree( direction, editorView ) {
    const { tr, doc, selection } = editorView.state
    const { $anchor } = selection
    const nodeIndex = $anchor.index()
    const parentNode = $anchor.node()
    let nextPos = null

    if( direction === 'up' ) { 
        // move the selection to the previous sibling. 
        if( nodeIndex > 0 ) {
            nextPos = $anchor.pos - $anchor.nodeBefore.nodeSize
        }
    } else if( direction === 'down' ) {
        // select the next sibling
        if( nodeIndex < parentNode.childCount-1 ) {
            nextPos = $anchor.pos + $anchor.nodeAfter.nodeSize
        }
    } else if( direction === 'left' ) {
        // select parent
        const parentPos = $anchor.start() - 1
        if( parentPos >= 0 ) {
            nextPos = parentPos
        }
    } else if( direction === 'right' ) {
        // select first child
        if( selection.node.childCount > 0 ) {
            const childNodeType = selection.node.child(0).type.name
            if( !childNodeType.includes('textNode') && !childNodeType.includes('globalNode') ) {
                nextPos = $anchor.pos + 1
            } else {
                navigateFromTreeToEditor(editorView)
            }
        }
    }

    if( nextPos !== null ) {
        tr.setSelection( NodeSelection.create(doc,nextPos) )
        editorView.dispatch(tr.scrollIntoView())    
    }
}

// Move the cursor to the beginning of the first child textNode or globalNode
export function navigateFromTreeToEditor( editorView ) {
    const { tr, doc, selection } = editorView.state
    const { $anchor } = selection
    tr.setSelection( TextSelection.create(doc,$anchor.pos+2) )
    editorView.dispatch(tr.scrollIntoView())        
}

// Move the selection to the closest ancestor leaf node
export function navigateFromEditorToTree( editorView ) {
    // TODO
}

export function getEnabledMenus(teiDocument) {
    const editorView = teiDocument.getActiveView()

    if( editorView ) {
        const { selection } = editorView.state
        if( selection.$cursor ) {
            return {
                marks: false,
                inline: true,
                eraser: false
            }
        } else if( selection.node ) {
            return {
                marks: false,
                inline: false,
                eraser: true
            }
        } else {
            return {
                marks: true,
                inline: false,
                eraser: true
            }
        }
    } 
    return {
        marks: false,
        inline: false,
        eraser: false
    }
}
