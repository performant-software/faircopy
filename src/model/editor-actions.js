import { NodeRange, Fragment } from 'prosemirror-model'
import { NodeSelection } from 'prosemirror-state'
import { addMark, insertNodeAt, insertAtomNodeAt, createAsideNode, deleteParentNode, markApplies, replaceTextNodes } from "./commands"
import { getTextNodeName } from './xml'

// creates inlines, marks, and inter marks
export function createPhraseElement( elementID, attrs, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const editorView = teiDocument.getActiveView()
    const { schema } = editorView.state
    const {pmType} = fairCopyProject.teiSchema.elements[elementID]
    const { asides, inter } = fairCopyProject.teiSchema.elementGroups

    if( pmType === 'inline-node' ) {
        if( asides.includes(elementID) ) {
            return createAside( elementID, attrs, teiDocument, editorView )
        } else {
            const inlineType = schema.nodes[elementID]
            return createInline( inlineType, editorView )
        }    
    } else if( pmType === 'mark' ) {
        const markType = schema.marks[elementID]
        return createMark( markType, attrs, editorView )
    } else if( inter.includes(elementID) ) {
        const markType = schema.marks[`mark${elementID}`]
        return createMark( markType, attrs, editorView )
    }
}

// create hard and soft elements
export function createStructureElement( elementID, nodePos, actionType, teiDocument, tr ) {
    // perform appropriate editor action on node
    switch( actionType ) {
      case 'addAbove':
        return addAbove(elementID,teiDocument,nodePos,tr)
      case 'addBelow':
        return addBelow(elementID,teiDocument,nodePos,tr)
      case 'addOutside':
        return addOutside(elementID,teiDocument,nodePos,tr)
      case 'addInside':
        return addInside(elementID,teiDocument,nodePos,tr)
      case 'replace':
        return replaceElement(elementID,teiDocument,nodePos,tr)
      default:
        console.error(`Unknown action type: ${actionType}`)
        return tr
    } 
}

export function determineRules( elementID, teiDocument ) {
    const teiSchema = teiDocument.fairCopyProject.teiSchema
    const {elements} = teiSchema
    const editorView = teiDocument.getActiveView()
    const { schema } = editorView.state
    const targetType = schema.nodes[elementID]

    const mayContainIDs = []
    for( const element of Object.values(elements) ) {
        const { name, pmType } = element
        if( pmType === 'node' ) {
            const testNode = schema.nodes[name].create() 
            if( targetType.validContent(Fragment.from(testNode)) ) {
                mayContainIDs.push(name)
            }
        }
    }
    const mayContain = mayContainIDs.length > 0 ? mayContainIDs.join(', ') : null

    const containedByIDs = []
    const testFragment = Fragment.from(targetType.create())
    for( const element of Object.values(elements) ) {
        const { name, pmType } = element
        if( pmType === 'node' ) {
            const parentType = schema.nodes[name]
            if( parentType.validContent(testFragment) ) {
                containedByIDs.push(name)
            }
        }
    }
    const containedBy = containedByIDs.length > 0 ? containedByIDs.join(', ') : null

    return {
        containedBy,
        mayContain,
        notes: null    
    }
}

export function validAction( elementID, teiDocument ) {
    const { fairCopyProject } = teiDocument
    const { pmType } = fairCopyProject.teiSchema.elements[elementID]
    const { inter } = fairCopyProject.teiSchema.elementGroups

    if( pmType === 'mark' ) {
        return validRangeAction(elementID, teiDocument)
    } else if( inter.includes(elementID) ) {
        return validRangeAction(`mark${elementID}`, teiDocument)
    } else {
        return validInlineAction(elementID, teiDocument)
    }
}

function validRangeAction(elementID, teiDocument) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema, selection } = editorView.state
    const markType = schema.marks[elementID]

    let {empty, $cursor, ranges} = selection
    if ((empty && !$cursor) || !markApplies(doc, ranges, markType)) {
        return false
    } else {
        return true
    }
}

export function validNodeAction( actionType, elementID, teiDocument, pos ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema } = editorView.state
    const nodeType = schema.nodes[elementID]
    const node = doc.nodeAt(pos)
    const $targetPos = doc.resolve(pos)
    const parentNode = $targetPos.parent
    const nodeIndex = $targetPos.index()
    const testNode = nodeType.create()

    // create a fragment that places the created node in position with its future siblings
    let testFragment
    if( actionType === 'addAbove' || actionType === 'addBelow' ) {
        const { content } = parentNode
        let siblings = []
        for( let i=0; i < content.childCount; i++ ) { siblings.push( content.child(i) ) }
        let before, after
        if( actionType === 'addAbove' ) {
            before = siblings.slice(0,nodeIndex)
            after = siblings.slice(nodeIndex)
        } else {
            before = siblings.slice(0,nodeIndex+1)
            after = siblings.slice(nodeIndex+1)
        }   
        siblings = before.concat([testNode]).concat(after)
        testFragment = Fragment.from(siblings)  
    } else if( actionType === 'replace' ) {
        const textNodeName = getTextNodeName(nodeType.spec.content)
        if( textNodeName ) {
            const testFragment = replaceTextNodes(schema.nodes[textNodeName], node.content)
            const c = nodeType.validContent(testFragment) 
            const d = parentNode.type.validContent(Fragment.from(nodeType.create()))  
            console.log(`c: ${c}, d: ${d}`)
            return c && d
        } else {
            testFragment = parentNode.content.replaceChild(nodeIndex, testNode)
            return nodeType.validContent(node.content) && parentNode.type.validContent(testFragment)
        }
    } else if( actionType === 'addOutside' ) {
        testFragment = parentNode.content.replaceChild(nodeIndex, testNode)
    } else {
        // addInside
        const textNodeName = getTextNodeName(nodeType.spec.content)
        // if the element can contain text nodes, 
        // form the testFragment with the valid textNode type for this element
        if( textNodeName ) {
            const nextContent = replaceTextNodes(schema.nodes[textNodeName], node.content)
            testFragment = Fragment.from(nodeType.create({},nextContent))
            return nodeType.validContent(node.content) && node.type.validContent(testFragment) 
        } else {
            const a = node.type.validContent(Fragment.from(nodeType.create()))
            const b = nodeType.validContent(node.content)
            console.log(`a: ${a}, b: ${b}`)
            return a && b
        }
    }

    switch(actionType) {
        case 'addOutside':
            return nodeType.validContent(Fragment.from(node)) && parentNode.type.validContent(testFragment)
        case 'addAbove':
        case 'addBelow':
            return parentNode.type.validContent(testFragment)
        default:
            throw new Error('Unrecognized action type.')
    }
}

function validInlineAction(elementID, teiDocument ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema, selection } = editorView.state
    const nodeType = schema.nodes[elementID]

    let {empty, $cursor} = selection
    if (empty && $cursor) {
        const pos = $cursor.pos
        const $targetPos = doc.resolve(pos)
        const parentNode = $targetPos.parent
        const testFragment = Fragment.from(nodeType.create({__id__: 'test'}))
        return parentNode.type.validContent(testFragment)
    } else {
        return true
    }
}

// changes the NodeType for a node element at a given pos
function replaceElement( elementID, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = editorView.state
    const nodeType = schema.nodes[elementID]
    const node = tr.doc.nodeAt(pos)

    if( node.childCount > 0 ) {
        const textNodeName = getTextNodeName(nodeType.spec.content)
        if( textNodeName ) {
            const fragment = nodeType.create( {}, replaceTextNodes(schema.nodes[textNodeName], node.content) )
            tr.replaceWith(pos, pos+2+node.content.size, fragment)    
            return tr
        } 
    }

    tr.setNodeMarkup(pos, nodeType, node.attrs)
    return tr
}

export function createInterNode( elementID, attrs, teiDocument ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = editorView.state

    const markType = schema.marks[`mark${elementID}`]
    return createMark( markType, attrs, editorView )
}

function addInside( elementID, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema } = editorView.state
    const parentNode = doc.nodeAt(pos)

    if( parentNode.childCount > 0 ) {
        // take the content of the parent and put it inside the new node
        const nodeType = schema.nodes[elementID]
        const textNodeName = getTextNodeName(nodeType.spec.content)
        if( textNodeName ) {
            const fragment = nodeType.create( {}, replaceTextNodes(schema.nodes[textNodeName], parentNode.content) )
            tr.replaceWith(pos, pos+2+parentNode.content.size, fragment)    
        } else {
            const fragment = parentNode.content
            const $start = doc.resolve(pos+1)
            const $end = doc.resolve(pos+1+fragment.size)
            const nodeRange = new NodeRange($start,$end,$start.depth)
            tr.wrap(nodeRange,[{type: nodeType}])
        }
        return tr
    } else {
        // insert node inside parent
        const { elements } = teiDocument.fairCopyProject.teiSchema
        return insertNodeAt( elementID, pos+1, schema, elements, tr )
    }
}
    
function addOutside( elementID, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema } = editorView.state

    const $pos = doc.resolve(pos)
    const nodeType = schema.nodes[elementID]

    const $start = doc.resolve($pos.start($pos.depth+1))
    const $end = doc.resolve($start.end($start.depth)+1)
    const nodeRange = new NodeRange($start,$end,$pos.depth)
    tr.wrap(nodeRange,[{type: nodeType}])
    return tr
}

function addAbove( elementID, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { teiSchema } = teiDocument.fairCopyProject
    const { schema } = editorView.state
    const { elementGroups } = teiSchema
    const { asides } = elementGroups
    const nodeType = schema.nodes[elementID]

    if( nodeType.isAtom ) {
        if( asides.includes(elementID) ) {
            const asideNode = createAsideNode( elementID, {}, teiDocument, editorView )
            return insertAtomNodeAt(asideNode, pos, editorView, true, tr )    
        } else {
            const node = nodeType.create()
            return insertAtomNodeAt(node, pos, editorView, false, tr )    
        }
    } else {
        return insertNodeAt(elementID, pos, schema, teiSchema.elements, tr )    
    }
}

function addBelow( elementID, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { doc } = editorView.state
    const { teiSchema } = teiDocument.fairCopyProject
    const { elementGroups } = teiSchema
    const { schema } = editorView.state
    const { asides } = elementGroups

    const nodeType = schema.nodes[elementID]
    const targetNode = doc.nodeAt(pos)
    const insertPos = pos + targetNode.nodeSize

    if( nodeType.isAtom ) {
        if( asides.includes(elementID) ) {
            const asideNode = createAsideNode( elementID, {}, teiDocument, editorView )
            return insertAtomNodeAt(asideNode, insertPos, editorView, true, tr )                
        } else {
            const node = nodeType.create()
            return insertAtomNodeAt(node, insertPos, editorView, true, tr )    
        }
    } else {
        return insertNodeAt(elementID, insertPos, schema, teiSchema.elements, tr )    
    }
}

export function onClippy() {
    // const html = fairCopy.services.readClipBoardHTML()
    // console.log( `clippy: ${html}`) 
}

export function eraseSelection(teiDocument) {
    const editorView = teiDocument.getActiveView()
    const { selection } = editorView.state
    let tr

    if( selection.node && !selection.node.isAtom ) {
        tr = deleteParentNode(editorView.state)
    } else {
        tr = editorView.state.tr
        let {empty, $cursor, ranges} = selection
        if (empty || $cursor) return
        for (let i = 0; i < ranges.length; i++) {
            let {$from, $to} = ranges[i]
            tr.removeMark($from.pos, $to.pos)
        }    
    }
    editorView.dispatch(tr)
    editorView.focus()
}

// Can the selected node move up or down the document?
function validMove(direction,teiDocument,metaKey) {
    const editorView = teiDocument.getActiveView()
    const {hard, inlines} = teiDocument.fairCopyProject.teiSchema.elementGroups
    const { selection } = editorView.state
    const { $anchor } = selection
    const nodeIndex = $anchor.index()
    const parentNode = $anchor.node()
    const grandParentNode = $anchor.node(-1)
    const selectedNode = selection.node

    // do nothing if root node, or can't move in requested direction
    // also, this doesn't apply to inline nodes
    if( !parentNode || inlines.includes(selectedNode.type.name) ) return false

    const nodes = []
    for( let i=0; i < parentNode.childCount; i++ ) {
        const child = parentNode.child(i)
        if( child !== selectedNode ) nodes.push(child)
    }

    if( direction === 'up' ) { 
        // if first sibling, see if we can move up and out of this parent
        if( nodeIndex === 0 ) {
            if( !grandParentNode ) return false
            const greatNodes = []
            for( let i=0; i < grandParentNode.childCount; i++ ) {
                const child = grandParentNode.child(i)
                greatNodes.push(child)
            }
            const insertIndex = greatNodes.indexOf(parentNode)
            greatNodes.splice(insertIndex,0,selectedNode)
            return parentNode.type.validContent(Fragment.fromArray(nodes)) && grandParentNode.type.validContent(Fragment.fromArray(greatNodes)) 
        // otherwise, we can move around within the parent  
        } else {
            const nodeBefore = $anchor.nodeBefore
            const parentType = nodeBefore.type.name
            // if the prev sibling is a hard node, join it as last sibling, if metakey is down, try to anyway
            if( metaKey || hard.includes( parentType ) ) {
                const nodeBeforeNodes = []
                for( let i=0; i < nodeBeforeNodes.childCount; i++ ) {
                    const child = nodeBeforeNodes.child(i)
                    nodeBeforeNodes.push(child)
                }
                nodeBeforeNodes.push(selectedNode)
                if( parentNode.type.validContent(Fragment.fromArray(nodes)) && nodeBefore.type.validContent(Fragment.fromArray(nodeBeforeNodes)) ) {
                    return 'join'
                } 
            } 
            const insertIndex = nodes.indexOf(nodeBefore)
            nodes.splice(insertIndex,0,selectedNode)
            if( parentNode.type.validContent(Fragment.fromArray(nodes)) ) {
                return 'skip'
            }
        }
    } else {
        // if we are the last sibling, try to move down and out of this parent
        if(nodeIndex >= parentNode.childCount-1) {
            if( !grandParentNode ) return false
            const greatNodes = []
            for( let i=0; i < grandParentNode.childCount; i++ ) {
                const child = grandParentNode.child(i)
                greatNodes.push(child)
            }
            const insertIndex = greatNodes.indexOf(parentNode) + 1
            greatNodes.splice(insertIndex,0,selectedNode)
            return parentNode.type.validContent(Fragment.fromArray(nodes)) && grandParentNode.type.validContent(Fragment.fromArray(greatNodes)) 
        // otherwise, move around within this parent
        } else {
            const swapNode = parentNode.child(nodeIndex+1)
            const parentType = swapNode.type.name
            // if next sibling is a hard node, join it as the first sibling, if metakey is down, try to anyway
            if( metaKey || hard.includes( parentType ) ) {
                const nodeAfterNodes = []
                for( let i=0; i < swapNode.childCount; i++ ) {
                    const child = swapNode.child(i)
                    nodeAfterNodes.push(child)
                }
                nodeAfterNodes.splice(0,0,selectedNode)
                if( parentNode.type.validContent(Fragment.fromArray(nodes)) && swapNode.type.validContent(Fragment.fromArray(nodeAfterNodes)) ) {
                    return 'join'
                }
             } 
            const insertIndex = nodes.indexOf(swapNode) + 1
            nodes.splice(insertIndex,0,selectedNode)
            if( parentNode.type.validContent(Fragment.fromArray(nodes)) ) {
                return 'skip'
            }      
        }
    }

    return false
}

// Move the selected node up or down the document
export function moveNode(direction,teiDocument,metaKey) {

    // can we move? if so, how?
    const validState = validMove( direction, teiDocument, metaKey ) 
    if(!validState) return 

    const editorView = teiDocument.getActiveView()
    const { tr, selection } = editorView.state
    const { $anchor } = selection
    const nodeIndex = $anchor.index()
    const parentNode = $anchor.node()

    if( direction === 'up' ) { 
        // if first sibling, see if we can move up and out of this parent
        if( nodeIndex === 0 ) {
            const selectedNode = selection.node
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            tr.delete(selectedPos, selectedEndPos)
            tr.insert(selectedPos-1, selectedNode )
            tr.setSelection( NodeSelection.create(tr.doc, selectedPos-1) )
        // otherwise, we can move around within the parent  
        } else {
            const selectedNode = selection.node
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            const nodeBefore = $anchor.nodeBefore
            const nodeBeforePos = selectedPos - nodeBefore.nodeSize 
            // if the prev sibling is a hard node, join it as last sibling
            if( validState === 'join' ) {
                tr.delete(selectedPos, selectedEndPos)
                tr.insert(selectedPos-1, selectedNode )
                tr.setSelection( NodeSelection.create(tr.doc, selectedPos-1) )
            } else {
                tr.replaceWith(nodeBeforePos,selectedEndPos,[selectedNode,nodeBefore])              
                tr.setSelection( NodeSelection.create(tr.doc, nodeBeforePos) )
            }        
        }
    } else {
        // if we are the last sibling, try to move down and out of this parent
        if(nodeIndex >= parentNode.childCount-1) {
            const selectedNode = selection.node
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            tr.delete(selectedPos, selectedEndPos)
            const insertPos = tr.mapping.map(selectedEndPos+1)
            tr.insert(insertPos, selectedNode )
            tr.setSelection( NodeSelection.create(tr.doc, insertPos) )
        // otherwise, move around within this parent
        } else {
            const selectedNode = selection.node
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            const swapNode = parentNode.child(nodeIndex+1)
            const swapPos = selectedPos + $anchor.nodeAfter.nodeSize 
            const swapEndPos = swapPos + swapNode.nodeSize
            // if next sibling is a hard node, join it as the first sibling
            if( validState === 'join' ) {
                tr.delete(selectedPos, selectedEndPos)
                const insertPos = tr.mapping.map(selectedEndPos+1)
                tr.insert(insertPos, selectedNode )
                tr.setSelection( NodeSelection.create(tr.doc, insertPos) )
            } else {
                tr.replaceWith(selectedPos,swapEndPos,[swapNode,selectedNode])    
                tr.setSelection( NodeSelection.create(tr.doc, selectedPos+swapNode.nodeSize) )
            }
        }
    }

    tr.scrollIntoView()
    editorView.dispatch(tr)
    editorView.focus()
}

function createMark(markType, attrs, editorView) {
    const cmd = addMark( markType, attrs )
    cmd( editorView.state, editorView.dispatch ) 
    editorView.focus()
}

function createInline( nodeType, editorView ) {
    const { state } = editorView
    const { tr, selection } = state
    const { $anchor } = selection
    const node = nodeType.create()
    tr.insert($anchor.pos, node) 
    editorView.dispatch(tr)
    editorView.focus()
}

function createAside( asideName, attrs, teiDocument, editorView ) {
    const { state } = editorView
    const { tr, selection } = state
    const { $head } = selection

    const asideNode = createAsideNode( asideName, attrs, teiDocument, editorView )
    tr.insert($head.pos, asideNode) 
    editorView.dispatch(tr)
}