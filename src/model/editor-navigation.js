import { TextSelection } from 'prosemirror-state'

export function navigateTree( direction, editorView, pos ) {
    const { doc } = editorView.state
    const $pos = doc.resolve(pos)
    const nodeIndex = $pos.index()
    const parentNode = $pos.node()
    let nextPos = null

    if( direction === 'up' ) { 
        // move the selection to the previous sibling. 
        if( nodeIndex > 0 ) {
            nextPos = $pos.pos - $pos.nodeBefore.nodeSize
        }
    } else if( direction === 'down' ) {
        // select the next sibling
        if( nodeIndex < parentNode.childCount-1 ) {
            nextPos = $pos.pos + $pos.nodeAfter.nodeSize
        }
    } else if( direction === 'left' ) {
        // select parent
        const parentPos = $pos.start() - 1
        if( parentPos >= 0 ) {
            nextPos = parentPos
        }
    } else if( direction === 'right' ) {
        // select first child
        if( parentNode.childCount > 0 ) {
            const childNodeType = parentNode.child(0).type.name
            if( !childNodeType.includes('textNode') && !childNodeType.includes('globalNode') ) {
                nextPos = $pos.pos + 1
            } else {
                navigateFromTreeToEditor(editorView,pos)
            }
        }
    }

    return nextPos
}

// Move the cursor to the beginning of the first child textNode or globalNode
export function navigateFromTreeToEditor( editorView, pos ) {
    const { tr, doc } = editorView.state
    tr.setSelection( TextSelection.create(doc,pos+1) )
    editorView.focus()
    editorView.dispatch(tr.scrollIntoView())
}

// Find the node position closest to the editor cursor
export function navigateFromEditorToTree( editorView ) {
    // const { tr, doc } = editorView.state
    // tr.setSelection( TextSelection.create(doc,0) )
    // editorView.dispatch(tr)
    return 0
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
