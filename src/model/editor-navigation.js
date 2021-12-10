import { cutSelectedNode, copySelectedNode, pasteSelectedNode } from "./cut-and-paste"
import { eraseSelection } from "./editor-actions"
import {undo, redo} from "prosemirror-history"
import {TextSelection} from "prosemirror-state"

export function navigateTree( direction, editorView, pos ) {
    const { doc } = editorView.state
    const $pos = doc.resolve(pos)
    const nodeIndex = $pos.index()
    const parentNode = $pos.node()
    
    let nextPos = pos, nextNode = parentNode

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
                nextNode = null
                nextPos = null
                editorView.focus()
            }
        }
    }

    const nextPath = nextNode ? getStructureNodeDisplayName( nextNode.type.name ) : null
    return { nextPos, nextPath }
}

// Find the structure tree leaf closest to the editor cursor
export function navigateFromEditorToTree( editorView ) {
    const { doc, selection } = editorView.state
    
    function findLeaf($pos) {
        const nextNode = $pos.node()
        const nodeType = nextNode.type.name
        const nextPos = $pos.start() - 1 >= 0 ? $pos.start() - 1 : 0

        if( nodeType.startsWith('textNode') || nodeType.startsWith('globalNode') ) {
            if( nextPos >= 0 ) {
                return findLeaf(doc.resolve(nextPos))
            } else {
                return { nextPos:null, nextPath:null }
            }
        } else {
            const nextPath = nextNode ? getStructureNodeDisplayName( nextNode.type.name ) : null
            return { nextPos, nextPath }
        }
    }
    
    const { $anchor } = selection
    return findLeaf($anchor)
}

export function navigateFromTreeToEditor( editorView, editorGutterPos ) {
    const { tr, doc } = editorView.state
    tr.setSelection( TextSelection.create(doc,editorGutterPos+1) )
    tr.scrollIntoView()
    tr.setMeta( 'currentTreeNode', { editorGutterPos: null, editorGutterPath: null, treeID: "main" } )
    tr.setMeta( 'highlightEnabled', true )
    editorView.dispatch(tr)
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

export function handleEditorHotKeys(event, teiDocument, onTogglePalette, onOpenElementMenu, clipboardSerializer ) {
    const editorView = teiDocument.getActiveView()
    const metaKey = ( event.ctrlKey || event.metaKey )

    const key = event.key.toLowerCase()

    if( metaKey && key === 'x' ) {
        cutSelectedNode( teiDocument, clipboardSerializer )
    }

    if( metaKey && key === 'c' ) {
        copySelectedNode( teiDocument, clipboardSerializer )
    }

    if( metaKey && key === 'v' ) {
        pasteSelectedNode( teiDocument )
    }

    const enabledMenus = getEnabledMenus(teiDocument)

    if( metaKey && key === '1' ) {
        onTogglePalette()
    }

    if( enabledMenus.marks && metaKey && key === '2' ) {
        onOpenElementMenu({ menuGroup: 'mark' })
    }

    if( enabledMenus.inline && metaKey && key === '3' ) {
        onOpenElementMenu({ menuGroup: 'inline' })
    }

    if( enabledMenus.eraser && metaKey && key === '4' ) {
        eraseSelection(teiDocument)
    }

    // handle undo and redo here so they are available even when focus is not in PM itself
    if( metaKey && key === 'z' ) {
        undo(editorView.state,editorView.dispatch)
    } 
    if( metaKey && ((event.shiftKey && key === 'z') || key === 'y' )) {
        redo(editorView.state,editorView.dispatch)
    } 
}