import { NodeRange, Fragment } from 'prosemirror-model'
import { NodeSelection } from 'prosemirror-state'
import { addMark, insertNodeAt, insertAtomNodeAt, deleteParentNode } from "./commands"
import { validMove, createValidNode } from './element-validators'

const elementListLength = 30

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
        return addAbove(elementID,{},teiDocument,nodePos,tr)
      case 'addBelow':
        return addBelow(elementID,{},teiDocument,nodePos,tr)
      case 'addOutside':
        return addOutside(elementID,{},teiDocument,nodePos,tr)
      case 'addInside':
        return addInside(elementID,{},teiDocument,nodePos,tr)
      case 'replace':
        return replaceElement(elementID,{},teiDocument,nodePos,tr)
      default:
        console.error(`Unknown action type: ${actionType}`)
        return tr
    } 
}

export function determineRules( elementID, teiSchema ) {
    const {schema, validationSet} = teiSchema
    const targetType = schema.nodes[elementID]

    const listToString = (list) => {
        let strList
        if( list.length > elementListLength ) {
            strList = list.slice(0,elementListLength)
            const others = list.length - elementListLength
            const s = others !== 1 ? 's' : ''
            strList.push(`and ${others} other${s}.`)
        } else {
            strList = list
        }
        return strList.length > 0 ? strList.join(', ') : null
    }

    let mayContainIDs = []
    for( const elementName of Object.keys(validationSet) ) {
        const testFragment = validationSet[elementName]
        if( targetType.validContent(testFragment) ) {
            mayContainIDs.push(elementName)
        }
    }
    const mayContain = listToString(mayContainIDs.sort())

    const containedByIDs = []
    const testFragment = validationSet[elementID]
    for( const elementName of Object.keys(validationSet) ) {
        const parentType = schema.nodes[elementName]
        if( parentType.validContent(testFragment) ) {
            containedByIDs.push(elementName)
        }
    }    
    const containedBy = listToString(containedByIDs.sort())

    return {
        containedBy,
        mayContain,
        notes: null    
    }
}

function replaceElement( elementID, attrs, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { schema } = editorView.state
    const { elements } = teiDocument.fairCopyProject.teiSchema
    const { createSubDocument } = teiDocument
    const node = tr.doc.nodeAt(pos)

    const fragment = createValidNode( elementID, attrs, node.content, schema, elements, createSubDocument )
    tr.replaceWith(pos, pos+2+node.content.size, fragment)    
    return tr
}

function addInside( elementID, attrs, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema } = editorView.state
    const { elements } = teiDocument.fairCopyProject.teiSchema
    const { createSubDocument } = teiDocument
    const parentNode = doc.nodeAt(pos)

    if( parentNode.childCount > 0 ) {
        // take the content of the parent and put it inside the new node
        const fragment = createValidNode( elementID, attrs, parentNode.content, schema, elements, createSubDocument )
        tr.replaceWith(pos+1, pos+1+parentNode.content.size, fragment)    
        return tr
    } else {
        const nodeType = schema.nodes[elementID]

        // insert node inside parent
        if( nodeType.isAtom ) {
            return insertAtomNodeAt(elementID, attrs, pos+1, schema, elements, false, tr, createSubDocument )
        } else {
            return insertNodeAt(elementID, attrs, pos+1, schema, elements, tr, createSubDocument )    
        }
    }
}
    
function addOutside( elementID, attrs, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { doc, schema } = editorView.state

    const $pos = doc.resolve(pos)
    const nodeType = schema.nodes[elementID]

    const $start = doc.resolve($pos.start($pos.depth+1))
    const $end = doc.resolve($start.end($start.depth)+1)
    const nodeRange = new NodeRange($start,$end,$pos.depth)
    tr.wrap(nodeRange,[{type: nodeType, attrs}])
    return tr
}

function addAbove( elementID, attrs, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { teiSchema } = teiDocument.fairCopyProject
    const { createSubDocument } = teiDocument
    const { schema } = editorView.state
    const { elements } = teiSchema
    const nodeType = schema.nodes[elementID]

    if( nodeType.isAtom ) {
        return insertAtomNodeAt(elementID, attrs, pos, schema, elements, false, tr, createSubDocument )
    } else {
        return insertNodeAt(elementID, attrs, pos, schema, elements, tr, createSubDocument )    
    }
}

function addBelow( elementID, attrs, teiDocument, pos, tr ) {
    const editorView = teiDocument.getActiveView()
    const { doc } = editorView.state
    const { teiSchema } = teiDocument.fairCopyProject
    const { elements } = teiSchema
    const { createSubDocument } = teiDocument
    const { schema } = editorView.state

    const nodeType = schema.nodes[elementID]
    const targetNode = doc.nodeAt(pos)
    const insertPos = pos + targetNode.nodeSize

    if( nodeType.isAtom ) {
        return insertAtomNodeAt(elementID, attrs, insertPos, schema, elements, true, tr, createSubDocument )
    } else {
        return insertNodeAt(elementID, attrs, insertPos, schema, teiSchema.elements, tr, createSubDocument )    
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
    const { teiSchema } = teiDocument.fairCopyProject
    const { schema } = teiSchema
    const { createSubDocument } = teiDocument

    const subDocID = createSubDocument(document,asideName,attrs)
    const nodeType = schema.nodes[asideName]
    const asideNode = nodeType.create({ id: '', __id__: subDocID, ...attrs })

    tr.insert($head.pos, asideNode) 
    editorView.dispatch(tr)
}