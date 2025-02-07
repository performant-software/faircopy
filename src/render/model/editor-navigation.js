
import {NodeSelection, TextSelection} from "prosemirror-state"
import { getHighlightRanges } from "./highlighter"
import { synthNameToElementName, findNoteNode } from "./xml"
import {undo, redo} from "prosemirror-history"
import { cutSelectedNode, copySelectedNode } from "./cut-and-paste"
import { eraseSelection } from "./editor-actions"


const fairCopy = window.fairCopy

export function navigateTree( direction, editorView, pos ) {
    const { doc } = editorView.state
    const $pos = doc.resolve(pos)
    const nodeIndex = $pos.index()
    const parentNode = $pos.node()
    
    let nextPos = pos, nextNode = parentNode

    if( direction === 'up' ) { 
        // move the selection to the previous sibling. 
        if( nodeIndex > 0 ) {
            const node = parentNode.child(nodeIndex-1)
            const nodeType = node.type.name
            // don't move into textNodes or globalNodes
            if( !nodeType.includes('textNode') && !nodeType.includes('globalNode') ) {
                nextNode = node
                nextPos = $pos.pos - $pos.nodeBefore.nodeSize            
            }
        }
    } else if( direction === 'down' ) {
        // select the next sibling
        if( nodeIndex < parentNode.childCount-1 ) {
            const node = parentNode.child(nodeIndex+1)
            const nodeType = node.type.name
            if( !nodeType.includes('textNode') && !nodeType.includes('globalNode') ) {
                nextNode = node
                nextPos = $pos.pos + $pos.nodeAfter.nodeSize
            }
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

    const nextPath = nextNode ? synthNameToElementName( nextNode.type.name ) : null
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
            const nextPath = nextNode ? synthNameToElementName( nextNode.type.name ) : null
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
    tr.setMeta( 'highlightEnabled', true )
    editorView.dispatch(tr)
}

export function selectElement( editorView, pos, nodeSelection ) {
    const { tr, doc } = editorView.state
    if( nodeSelection ) {
        tr.setSelection( NodeSelection.create(doc,pos) )
    } else {
        tr.setSelection( TextSelection.create(doc,pos+1) )
    }
    tr.scrollIntoView()
    editorView.dispatch(tr)
}

export function getEnabledMenus(teiDocument) {
    const editorView = teiDocument.getActiveView()
    const {editorGutterPos} = teiDocument.currentTreeNode

    if( editorView ) {
        const { selection } = editorView.state
        if( editorGutterPos !== null ) {
            return {
                marks: false,
                inline: false,
                eraser: true
            }
        } else if( selection.$cursor) {
            return {
                marks: false,
                inline: true,
                eraser: false
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

export function arrowNavToNote( openNotePopup, teiDocument, direction ) {
    const { editorView } = teiDocument
    const { selection } = editorView.state
    
    if( selection && selection.node ) {
        const { node } = selection
        const nodeName = node.type.name
        const {teiSchema} = teiDocument.fairCopyProject
    
        if( teiSchema.elementGroups.asides.includes(nodeName) ) {
            const noteID = node.attrs['__id__']
            const { $anchor } = selection
            const anchorEl = editorView.nodeDOM($anchor.pos)
            openNotePopup(noteID, anchorEl)
        } 
        else {
            const {tr, selection} = editorView.state
            const {$anchor} = selection
            tr.setSelection(TextSelection.create(tr.doc, $anchor.pos + direction))
            editorView.dispatch(tr)
        }    
    }
}

export function getEditorCommands( teiDocument, onTogglePalette, onOpenElementMenu, clipboardSerializer, onToggleSearchBar ) {
    const editorView = teiDocument.getActiveView()
    const enabledMenus = getEnabledMenus(teiDocument)
    
    return {
        onTogglePalette: (e) => { 
            // for some reason, just hitting meta key will activate this handler after it 
            // has been activated once.. check that we also hit the 1 key.
            if( e.key === '1' ) {
                onTogglePalette()     
            }
        },
        onOpenMarkMenu: () => { 
            if(enabledMenus.marks) onOpenElementMenu({ menuGroup: 'mark' }) 
        }, 
        onOpenInineMenu: () => { 
            if(enabledMenus.inline) onOpenElementMenu({ menuGroup: 'inline' }) 
        }, 
        eraseSelection: () => { 
            if(enabledMenus.eraser) eraseSelection(teiDocument) 
        },
        undo: () => { undo(editorView.state,editorView.dispatch) },
        redo: () => { redo(editorView.state,editorView.dispatch) },
        cutSelectedNode: () => { cutSelectedNode( teiDocument, clipboardSerializer ) },
        copySelectedNode: () => { copySelectedNode( teiDocument, clipboardSerializer ) },
        openSearchBar: () => { 
            console.log('open search bar')
            onToggleSearchBar(true)
        },
        closeSearchBar: () => { 
            onToggleSearchBar(false)
        }
    }
}

export function getSelectedElements( teiDocument, noteID ) {
    const { asides } = teiDocument.fairCopyProject.teiSchema.elementGroups
    const { editorGutterPos } = teiDocument.currentTreeNode

    const editorView = teiDocument.getActiveView()
    const selection = (editorView) ? editorView.state.selection : null 
    
    // create a list of the selected phrase level elements 
    let elements = []
    if( editorGutterPos !== null ) {
        const { doc } = editorView.state
        const $pos = doc.resolve(editorGutterPos)
        const node = $pos.node().child($pos.index())
        if( node.type.name.endsWith('X') ) {
            // find the node in the main document
            const mainDoc = teiDocument.editorView.state.doc
            const { noteNode } = findNoteNode( mainDoc, noteID )
            if( noteNode ) {
                elements.push( noteNode )
            }
        } else {
            elements.push( node )
        }
    } else if( selection ) {
        if( selection.node ) {
            const name = selection.node.type.name
            if( !asides.includes(name) && !name.includes('globalNode') ) {
                elements.push( selection.node )
            } 
        } else {
            // highlight ranges are not active when there's a browser selection 
            const browserSelection = window.getSelection()
            if( browserSelection.isCollapsed ) {
                const { doc } = editorView.state
                const { $anchor } = selection
                const highlightRanges = getHighlightRanges(doc,$anchor)
                for( const highlightRange of highlightRanges ) {
                    elements.push( highlightRange.mark )
                }         
            } 
        }
    } 

    return elements
}

export function broadcastZoneLinks( teiDocument ) {
    const { selectedElements, parentEntry } = teiDocument
    const {teiSchema, idMap} = teiDocument.fairCopyProject

    const selectedZones = []
    for( const element of selectedElements ) {
        for( const attr of Object.keys(element.attrs) ) {
            const attrSpec = teiSchema.getAttrSpec( attr, element.type.name )
            const dataType = attrSpec?.dataType

            // is the attribute a tei data pointer?
            if( dataType === 'teidata.pointer' ) {
                const uris = element.attrs[attr]?.split(" ")
                if( uris ) {
                    for( const uri of uris ) {
                        // gather any zone uris
                        const entry = idMap.get( uri, parentEntry?.localID )
                        if( entry && entry.type === 'zone' ) {
                            selectedZones.push(uri)
                        }
                    }    
                }
            }
        }
    }

    fairCopy.ipcSend('selectedZones', selectedZones )
}