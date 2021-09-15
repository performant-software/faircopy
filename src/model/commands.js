import { NodeSelection } from "prosemirror-state"
import { Node, Fragment } from "prosemirror-model"

import { getTextNodeName } from './xml'

export function markApplies(doc, ranges, type) {
    for (let i = 0; i < ranges.length; i++) {
        let {$from, $to} = ranges[i]
        let can = true 
        doc.nodesBetween($from.pos, $to.pos, node => {
            if( node.type.name.includes('textNode') && !node.type.allowsMarkType(type) ) {
                can = false
                return false
            } 
        })
        if (!can) return false
    }
    return true
}

export function addMark(markType,attrs) {
    return function(state, dispatch) {
        let {empty, $cursor, ranges} = state.selection
        if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType)) {
            dispatch( state.tr.setMeta('alertMessage', `Cannot apply mark at this location.`) )
            return false
        } 
        if (dispatch) {
            if ($cursor) {
                dispatch(state.tr.addStoredMark(markType.create(null)))
            } else {
                const {tr} = state
                for (let i = 0; i < ranges.length; i++) {
                    const {$from, $to} = ranges[i]
                    const markParams = generateMarks(state.doc, markType, attrs, $from, $to)
                    for( const markParam of markParams ) {
                        tr.addMark(...markParam)
                    }
                }
                dispatch(tr.scrollIntoView())
            }
        }
        return true
    }
}

function combineAttrs( requestedAttrs, existingAttrs ) {
    const nextAttrs = { ...existingAttrs }

    for( const key of Object.keys(requestedAttrs) ) {
        const nextVal = requestedAttrs[key]
        if( nextAttrs[key] ) {
            const vals = nextAttrs[key].split(' ')
            if( !vals.includes(nextVal) ) {
                nextAttrs[key] = `${nextAttrs[key]} ${nextVal}`
            }
        } else {
            nextAttrs[key] = nextVal
        }
    }
    
    return nextAttrs
}

function generateMarks( doc, markType, attrs, $from, $to ) {   
    const parentNode = $from.parent
    let from = $from.pos
    const parentStartPos = from - $from.parentOffset
    const parentEndPos = parentStartPos + parentNode.nodeSize

    // don't allow bounds beyond the current node
    let to = ($to.pos > parentEndPos) ? parentEndPos : $to.pos

    const markParams = []
    for( let i=from; i < to; i++ ) {
        let markParam
        if( doc.rangeHasMark(i,i+1,markType) ) {
            const $m = doc.resolve(i+1)
            const marks = $m.marks()
            const mark = marks.find((m) => m.type === markType )
            const nextAttrs = combineAttrs( attrs, mark.attrs ) 
            markParam = [ i, i+1, markType.create(nextAttrs) ]
        } else {
            markParam = [i,i+1,markType.create(attrs)]
        }
        markParams.push(markParam)
    }    

    return markParams
}

export function removeMark(markType) {
    return function(state, dispatch) {
        let {empty, $cursor, ranges} = state.selection
        if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType)) return false
        if (dispatch) {
            if ($cursor) {
                dispatch(state.tr.removeStoredMark(markType))
            } else {
                let has = false, tr = state.tr
                for (let i = 0; !has && i < ranges.length; i++) {
                    let {$from, $to} = ranges[i]
                    has = state.doc.rangeHasMark($from.pos, $to.pos, markType)
                }
                for (let i = 0; i < ranges.length; i++) {
                    let {$from, $to} = ranges[i]
                    if (has) tr.removeMark($from.pos, $to.pos, markType)
                }
                dispatch(tr.scrollIntoView())
            }
        }
        return true
    }
}


export function insertAtomNodeAt( node, insertPos, editorView, below=false, tr ) {
    const { doc } = editorView.state
    
    const offset = below ? 1 : -1
    const $prev = doc.resolve(insertPos+offset)

    // if there's already a globalNode, insert within it.
    if( $prev && $prev.parent && $prev.parent.type.name.includes('globalNode') ) {            
        tr.insert(insertPos+offset,node)
    } else {
        tr.insert(insertPos,node)
    }
    return tr
}

export function createValidNode( elementID, content, schema, elements ) {
    const { defaultNodes, fcType } = elements[elementID]
    const nodeType = schema.nodes[elementID]
    let node

    if( fcType === 'hard' ) {
        // if default nodes are provided, use them to wrap the text node
        let fragment
        if( content.childCount === 0 ) {
            const nodes = []
            for( const defaultNode of defaultNodes ) {
                const node = createValidNode( defaultNode, content, schema, elements )
                if( !node ) return null
                nodes.push(node)
            }    
            fragment = Fragment.from(nodes)
        } else {
            let hasTextNode = false
            for( let i=0; i < content.childCount; i++ ) {
                const contentChild = content.child(i)
                if( contentChild.type.name.startsWith('textNode') ) {
                    hasTextNode = true
                    break
                }
            }
            if( hasTextNode ) {
                // if any of the nodes in the fragment are text nodes, 
                // the content must be wrapped in the first default node
                let nodes = [], first = true
                for( const defaultNode of defaultNodes ) {
                    const childContent = first ? content : Fragment.empty
                    first = false
                    const node = createValidNode( defaultNode, childContent, schema, elements )
                    if( !node ) return null
                    nodes.push(node)
                }    
                fragment = Fragment.from(nodes)
            } else {
                fragment = content
            }
        }
        if( !nodeType.validContent(fragment) ) return null
        node = nodeType.create({}, fragment)
    } else {
        // valid nodes must have a textNode as a descendant
        const textNodeName = getTextNodeName(nodeType.spec.content)
        if( textNodeName ) {
            if( content.childCount > 0 ) {
                // make sure it is the right sort of text node
                const fragment = replaceTextNodes(schema.nodes[textNodeName], content)
                if( !fragment || !nodeType.validContent(fragment) ) return null
                node = nodeType.create({},fragment)    
            } else {
                // if no text node exists, create one
                const textNodeType = schema.nodes[textNodeName]
                node = nodeType.create({}, textNodeType.create() )
            }
        } else {
            throw new Error(`${elementID} is required to have a textNode as a descendant.`)
        }
    }
    return node
}    

export function insertNodeAt( elementID, insertPos, schema, elements, tr ) {
    const validNode = createValidNode(elementID,Fragment.empty,schema,elements)
    tr.insert( insertPos, validNode )
    return tr             
}

export function changeAttributes( element, newAttrs, $anchor, tr ) {
    if( element instanceof Node ) {
        const {pos} = $anchor
        const selection = tr.selection
        tr.setNodeMarkup(pos,element.type,newAttrs)
        if( selection.from === pos ) {
            const nextSelection = new NodeSelection(tr.doc.resolve(pos))
            tr.setSelection( nextSelection )
        }
        return element
    } else {
        const { from, to } = markExtent($anchor,element,tr.doc)
        const nextMark = element.type.create( newAttrs )
        tr.removeMark(from,to,element)
        tr.addMark(from,to,nextMark)
        return nextMark
    }
}

function isBlank(node) {
    if( node.childCount === 0 ) return true
    if( node.childCount > 1 ) return false
    const child = node.child(0)
    if( child.type.name.includes('textNode') ) {
        if( child.textContent.match(/\S+/) ) return false
        return true
    }
    return false
}

export function deleteParentNode(state) {
    const { tr, selection } = state
    const { node, $anchor } = selection
    const { pos } = $anchor
    const grandParentNode = $anchor.node()

    // need to have a grand parent to adopt children
    if(!grandParentNode) return tr

    const greatNodes = [], children = []
    for( let i=0; i < grandParentNode.childCount; i++ ) {
        const child = grandParentNode.child(i)
        if( child === node ) {
            if( !isBlank(node) ) {
                for( let i=0; i < node.childCount; i++ ) {
                    const grandChild = node.child(i)
                    greatNodes.push(grandChild)
                    children.push(grandChild)
                }    
            }
        } else {
            greatNodes.push(child)
        }
    }

    if( grandParentNode.type.validContent(Fragment.fromArray(greatNodes)) ) {
        tr.replaceWith(pos,pos+node.nodeSize,children) 
    } 
    else {
        // if there's only one child node and it is empty, then delete
        // for content expressions similar to: model_placeLike+
        if( children.length === 1 && isBlank(children[0])) {
            tr.replaceWith(pos,pos+node.nodeSize,Fragment.empty) 
        } else {
            tr.setMeta('alertMessage', "You must delete the element's content before removing it.")
        }
    }
    return tr
}

function findMarkExtent(doc,mark,startPos,dir,endPos) {
    let result = -1

    let testFn
    if( dir === -1 ) {
        testFn = (i) => (i >= endPos)
    } else {
        testFn = (i) => (i <= endPos)
    }

    for( let i=startPos; testFn(i); i+=dir ) {
        if( doc.rangeHasMark( i, i+1, mark ) ) {
            result = (dir === -1) ? i : i+1
        } else break
    }
    return result
}

export function markExtent($anchor, mark, doc) {
    const parentNode = $anchor.parent
    const pos = $anchor.pos
    const parentStartPos = pos - $anchor.parentOffset
    const parentEndPos = parentStartPos + parentNode.nodeSize

    // walk from index in parent node backwards until we encounter text wo/this mark
    const backwards = findMarkExtent(doc,mark,pos-1,-1,parentStartPos)
    const from = (backwards !== -1 ) ? backwards : pos

    // now walk forwards, doing the same thing
    const forwards = findMarkExtent(doc,mark,pos,1,parentEndPos-1)
    const to = (forwards !== -1 ) ? forwards : pos

    return { from, to }
}

export function createAsideNode( asideName, attrs, teiDocument, editorView ) {
    const { state } = editorView
    const subDocID = teiDocument.createSubDocument(document,asideName,attrs)
    return state.schema.node(asideName, { id: '', __id__: subDocID, ...attrs })
}

// take content fragment and replace any text nodes in there with text node type
export function replaceTextNodes( textNodeType, fragment ) {
    let siblings = []
    for( let i=0; i < fragment.childCount; i++ ) { 
        const sibling = fragment.child(i)
        if( sibling.type.name.includes('textNode') && sibling.type.name !== textNodeType.name ) {
            const textNodeContent = sibling.content
            for( let i=0; i < textNodeContent.childCount; i++ ) {
                const node = textNodeContent.child(i)
                for( const mark of node.marks ) {
                    if( !textNodeType.allowsMarkType(mark.type) ) {
                        // if any marks are not allowed for this textNode
                        return null
                    }
                }
            }
            const nextSib = textNodeType.create(sibling.attr, sibling.content )
            siblings.push( nextSib ) 
        } else {
            siblings.push( sibling ) 
        }
    }

    // return new content fragment 
    return Fragment.from(siblings) 
}