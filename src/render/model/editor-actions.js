import { NodeRange, Fragment } from 'prosemirror-model'
import { addMark, insertNodeAt, insertAtomNodeAt, deleteParentNode } from "./commands"
import { validMove, createValidNode } from './element-validators'
import { getTextNodeName, synthNameToElementName } from './xml'

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

    // clear current tree node since it may no longer be a valid position
    teiDocument.currentTreeNode = { editorGutterPos: null, editorGutterPath: null, treeID: teiDocument.currentTreeNode.treeID }

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
    const {schema, validationSet, elements} = teiSchema
    const element = elements[elementID]
    const { fcType } = element

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

    // inlines can't contain anything
    if( fcType !== 'inlines' ) {
        // use the content element (eg noteX) to determine what can be 
        const targetType = fcType === 'asides' ? schema.nodes[`${elementID}X`] : schema.nodes[elementID]

        for( const elementName of Object.keys(validationSet) ) {   
            const elementFCType = elements[elementName].fcType
            let testFragment
            // the validation set is an optimization to reduce the amount of fragments we are creating/destroying
            // here. However, for inlines and asides, their globalNode depends on parent, so can't create them ahead of time.
            if( elementFCType === 'inlines' || elementFCType === 'asides' ) {
                let node = createValidNode( elementName, {}, Fragment.empty, schema, elements, targetType )
                testFragment = node ? Fragment.from(node) : null
            } else {
                testFragment = validationSet[elementName]
            }
            if( testFragment && targetType.validContent(testFragment) ) {
                mayContainIDs.push(elementName)
            }    
        }
    }    

    const mayContain = listToString(mayContainIDs.sort())

    const containedByIDs = []

    for( const elementName of Object.keys(validationSet) ) {
        const elementFCType = elements[elementName].fcType
        // can't be contained by inlines
        if( elementFCType === 'inlines' ) continue
        const parentType = elementFCType === 'asides' ? schema.nodes[`${elementName}X`] : schema.nodes[elementName]
        
        let testFragment
        if( fcType === 'inlines' || fcType === 'asides' ) {
            const node = createValidNode( elementID, {}, Fragment.empty, schema, elements, parentType )
            testFragment = node ? Fragment.from(node) : null
        } else {
            testFragment = validationSet[elementID]
        }

        if( testFragment && parentType.validContent(testFragment) ) {
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
    const $pos =  tr.doc.resolve(pos)
    const parentType = $pos.parent.type

    const fragment = createValidNode( elementID, attrs, node.content, schema, elements, parentType, createSubDocument )
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
        const fragment = createValidNode( elementID, attrs, parentNode.content, schema, elements, parentNode, createSubDocument )
        tr.replaceWith(pos+1, pos+1+parentNode.content.size, fragment)    
        return tr
    } else {
        const nodeType = schema.nodes[elementID]

        // insert node inside parent
        if( nodeType.isAtom ) {
            return insertAtomNodeAt(elementID, attrs, pos+1, schema, elements, 'inside', tr, createSubDocument )
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
        return insertAtomNodeAt(elementID, attrs, pos, schema, elements, 'above', tr, createSubDocument )
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
        return insertAtomNodeAt(elementID, attrs, insertPos, schema, elements, 'below', tr, createSubDocument )
    } else {
        return insertNodeAt(elementID, attrs, insertPos, schema, teiSchema.elements, tr, createSubDocument )    
    }
}

export function onClippy() {
    // const html = fairCopy.readClipBoardHTML()
    // console.log( `clippy: ${html}`) 
}

export function eraseSelection(teiDocument) {
    const editorView = teiDocument.getActiveView()
    let { selection, tr } = editorView.state
    const { currentTreeNode } = teiDocument

    if( currentTreeNode.editorGutterPos !== null ) {
        tr = deleteParentNode(currentTreeNode.editorGutterPos, editorView.state.tr)
        teiDocument.currentTreeNode = { editorGutterPos: null, editorGutterPath: null, treeID: "main" }
        tr.setMeta( 'highlightEnabled', true )
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
export function moveNode(direction,teiDocument,pos,metaKey) {

    // can we move? if so, how?
    const validState = validMove( direction, teiDocument, pos, metaKey ) 
    if(!validState) return 

    const editorView = teiDocument.getActiveView()
    const { tr, doc, schema } = editorView.state
    const { elements } = teiDocument.fairCopyProject.teiSchema
    const $anchor = doc.resolve(pos) 
    const nodeIndex = $anchor.index()
    const parentNode = $anchor.node()
    const selectedNode = parentNode.child(nodeIndex)
    let editorGutterPos

    if( direction === 'up' ) { 
        // if first sibling, move up and out of this parent
        if( nodeIndex === 0 ) {
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            const parentNode = $anchor.parent

            tr.delete(selectedPos, selectedEndPos)
            tr.insert(selectedPos-1, selectedNode )

            // if this was the only element and this element can contain text, then add a textnode
            if( parentNode.childCount === 1 ) {
                const textNodeName = getTextNodeName(parentNode.type.spec.content)
                if( textNodeName ) {
                    const textNode = schema.node(textNodeName)
                    tr.insert(selectedEndPos, textNode)    
                } else {
                    // if parent doesn't have a textNode, then leave a blank copy of selected node in its place
                    const replacementNode = createValidNode( selectedNode.type.name, {}, Fragment.empty, schema, elements, parentNode )
                    tr.insert(selectedEndPos, replacementNode) 
                }
            }

            editorGutterPos = selectedPos-1
        // otherwise, we can move around within the parent  
        } else {
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            const nodeBefore = $anchor.nodeBefore
            const nodeBeforePos = selectedPos - nodeBefore.nodeSize 
            // if the prev sibling is a hard node, join it as last sibling
            if( validState === 'join' ) {
                tr.delete(selectedPos, selectedEndPos)
                tr.insert(selectedPos-1, selectedNode )
                let textNodePos = nodeBeforePos+1
                let nextSelectPos = selectedPos-1
                for( let i=0; i < nodeBefore.childCount; i++ ) {
                    const child = nodeBefore.child(i)
                    // if this element contains a blank text node, then remove it
                    if( child.type.name.includes('textNode') && child.textContent.length === 0 ) {
                        tr.delete(textNodePos,textNodePos+1)
                        nextSelectPos = nodeBeforePos+1
                    }
                    textNodePos = textNodePos + child.nodeSize
                }
                editorGutterPos = nextSelectPos
            } else {
                tr.replaceWith(nodeBeforePos,selectedEndPos,[selectedNode,nodeBefore])              
                editorGutterPos = nodeBeforePos
            }        
        }
    } else {
        // if we are the last sibling, move down and out of this parent
        if(nodeIndex >= parentNode.childCount-1) {
            const selectedPos = $anchor.pos
            const selectedEndPos = selectedPos + $anchor.nodeAfter.nodeSize 
            tr.delete(selectedPos, selectedEndPos)
            const insertPos = tr.mapping.map(selectedEndPos+1)
            tr.insert(insertPos, selectedNode )

            // if this was the only element and this element can contain text, then add a textnode
            if( parentNode.childCount === 1 ) {
                const textNodeName = getTextNodeName(parentNode.type.spec.content)
                const textNodePos = tr.mapping.map(selectedPos)
                if( textNodeName ) {
                    const textNode = schema.node(textNodeName)
                    tr.insert(textNodePos, textNode)                        
                } else {
                    // if parent doesn't have a textNode, then leave a blank copy of selected node in its place
                    const replacementNode = createValidNode( selectedNode.type.name, {}, Fragment.empty, schema, elements, parentNode )
                    tr.insert(textNodePos, replacementNode) 
                }
                editorGutterPos =insertPos+2
            } else {
                editorGutterPos =insertPos
            }
        // otherwise, move around within this parent
        } else {
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
                let textNodePos = selectedEndPos+1
                let nextSelectPos = insertPos
                for( let i=0; i < swapNode.childCount; i++ ) {
                    const child = swapNode.child(i)
                    // if this element contains a blank text node, then remove it
                    if( child.type.name.includes('textNode') && child.textContent.length === 0 ) {
                        tr.delete(textNodePos,textNodePos+1)
                        nextSelectPos = insertPos
                    }
                    textNodePos = textNodePos + child.nodeSize
                }
                editorGutterPos = nextSelectPos
            } else {
                tr.replaceWith(selectedPos,swapEndPos,[swapNode,selectedNode])    
                editorGutterPos =selectedPos+swapNode.nodeSize
            }
        }
    }

    const editorGutterPath = synthNameToElementName( selectedNode.type.name )
    const treeID = teiDocument.getActiveViewType()
    teiDocument.currentTreeNode = { editorGutterPos, editorGutterPath, treeID }
    tr.scrollIntoView()
    editorView.dispatch(tr)
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
    const { selection } = state
    const { $head } = selection
    const { teiSchema } = teiDocument.fairCopyProject
    const { schema, elements } = teiSchema
    const { createSubDocument } = teiDocument
    
    const tr = insertAtomNodeAt(asideName, attrs, $head.pos, schema, elements, 'inside', state.tr, createSubDocument )
    editorView.dispatch(tr)
    editorView.focus()
}