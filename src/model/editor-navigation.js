
export function navigateTree( direction, editorView, pos ) {
    const { doc } = editorView.state
    const $pos = doc.resolve(pos)
    const nodeIndex = $pos.index()
    const parentNode = $pos.node()
    
    let nextPos = null, nextNode = null

    if( direction === 'up' ) { 
        // move the selection to the previous sibling. 
        if( nodeIndex > 0 ) {
            nextNode = parentNode.child(nodeIndex-1)
            nextPos = $pos.pos - $pos.nodeBefore.nodeSize
        }
    } else if( direction === 'down' ) {
        // select the next sibling
        if( nodeIndex < parentNode.childCount-1 ) {
            nextNode = parentNode.child(nodeIndex+1)
            nextPos = $pos.pos + $pos.nodeAfter.nodeSize
        }
    } else if( direction === 'left' ) {
        // select parent
        const parentPos = $pos.start() - 1
        if( parentPos >= 0 ) {
            nextNode = parentNode
            nextPos = parentPos
        }
    } else if( direction === 'right' ) {
        // select first child
        const node = parentNode.child(nodeIndex)
        if( node.childCount > 0 ) {
            const firstChild = node.child(0)
            const childNodeType = firstChild.type.name
            if( !childNodeType.includes('textNode') && !childNodeType.includes('globalNode') ) {
                nextNode = firstChild
                nextPos = $pos.pos + 1
            } else {
                editorView.focus()
            }
        }
    }

    const nextPath = nextNode ? getStructureNodeDisplayName( nextNode.type.name ) : null
    console.log(nextPath)
    return { nextPos, nextPath }
}

// Find the node position closest to the editor cursor
export function navigateFromEditorToTree( editorView ) {
    // TODO find leaf node on structure tree that is the parent of the current text selection pos
    return 0
}

export function getStructureNodeDisplayName( nodeName ) {
    return nodeName.endsWith('X') ? nodeName.slice(0,-1) : nodeName
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
