import { NodeSelection } from "prosemirror-state"
import { Node, Fragment } from "prosemirror-model"

import { getTextNodeName } from './xml'

function markApplies(doc, ranges, type) {
    for (let i = 0; i < ranges.length; i++) {
        let {$from, $to} = ranges[i]
        let can = $from.depth === 0 ? doc.type.allowsMarkType(type) : false
        doc.nodesBetween($from.pos, $to.pos, node => {
            if (can) return false
            can = node.inlineContent && node.type.allowsMarkType(type)
        })
        if (can) return true
    }
    return false
}

export function addMark(markType,attrs) {
    return function(state, dispatch) {
        let {empty, $cursor, ranges} = state.selection
        if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType)) return false
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
    if( $prev && $prev.parent && $prev.parent.type.name === 'globalNode' ) {            
        tr.insert(insertPos+offset,node)
    } else {
        tr.insert(insertPos,node)
    }
    return tr
}

function createValidNode( elementID, schema, elements ) {
    const { defaultNodes } = elements[elementID]
    const nodeType = schema.nodes[elementID]
    let node

    if( defaultNodes ) {
        // if default nodes are provided, use them to wrap the text node
        const nodes = defaultNodes.map( elementID => createValidNode( elementID, schema, elements ) )
        node = nodeType.create({}, nodes)
    } else {
        // otherwise, find wrapping 
        const textNodeName = getTextNodeName(nodeType.spec.content)
        const textNodeType = schema.nodes[textNodeName]
        const connective = nodeType.contentMatch.findWrapping(textNodeType)
        if( connective ) {
            let wrap = textNodeType.create()
            for (let i = connective.length - 1; i >= 0; i--) {
                wrap = Fragment.from(connective[i].create(null, wrap))
            }
            node = nodeType.create({},wrap)
        } else {
            throw new Error("No path to textnode")
        }
    }
    return node
}    

export function insertNodeAt( elementID, insertPos, schema, elements, tr ) {
    const validNode = createValidNode(elementID,schema,elements)
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