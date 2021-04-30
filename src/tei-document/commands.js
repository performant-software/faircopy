import { NodeSelection, TextSelection } from "prosemirror-state"
import { Node, Fragment } from "prosemirror-model"

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

export function addMark(markType) {
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
                    const {from, to, attrs} = preventOverlap(state.doc, markType, $from, $to)
                    tr.addMark(from, to, markType.create(attrs))
                    // change the range to a cursor at the end of the first range
                    if( i === 0 ) {
                        const cursorPos = tr.doc.resolve(to)
                        tr.setSelection(new TextSelection(cursorPos,cursorPos))                
                    }
                }
                dispatch(tr.scrollIntoView())
            }
        }
        return true
    }
}

function preventOverlap( doc, markType, $from, $to ) {   
    const parentNode = $from.parent
    let from = $from.pos
    const parentStartPos = from - $from.parentOffset
    const parentEndPos = parentStartPos + parentNode.nodeSize

    // don't allow bounds beyond the current node
    let to = ($to.pos > parentEndPos) ? parentEndPos : $to.pos

    let firstMarkPos = null, firstMark = null

    // detect marks of markType in this range, adjust bounds to absorb these
    for( let i=from; i <= to; i++ ) {
        const $cursor = doc.resolve(i)
        const marks = $cursor.marks()
        for( const mark of marks ) {
            if( mark.type === markType ) {
                const extent = markExtent($cursor, mark, doc)
                from = extent.from < from ? extent.from : from
                to = extent.to > to ? extent.to : to
                if( !firstMarkPos || extent.from < firstMarkPos ) {
                    firstMark = mark
                    firstMarkPos = extent.from
                }
            }
        }
    }    

    // if we found a mark of this type, use its attrs instead
    const attrs = (firstMarkPos) ? firstMark.attrs : null

    return { from, to, attrs }
}

    // let to

    // // second pass: detect overlap with from to end range
    // for( to=from; to < end; to++ ) {
    //     const $cursor = doc.resolve(to)
    //     const marks = $cursor.marks()
    //     for( const mark of marks ) {
    //         const extent = markExtent($cursor, mark, doc)
    //         if( extent.from < from && extent.to < end) {
    //             // overlap found: clip range
    //             return { from, to: extent.to } 
    //         }
    //         if( extent.from > from && extent.to > end) {
    //             // overlap found: clip range
    //             return { from, to: extent.from } 
    //         }
    //     }
    // }

    // // no overlap with existing marks
    // return { from, to, attrs }
// }

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

export function insertNodeAt( nodeType, insertPos, editorView, schema, tr ) {

    // element must ultimately wrap a textNode, so find wrapping 
    const textNodeType = schema.nodes['textNode']
    const connective = nodeType.contentMatch.findWrapping(textNodeType)
    if( connective ) {
        let wrap = textNodeType.create()
        for (let i = connective.length - 1; i >= 0; i--) {
            wrap = Fragment.from(connective[i].create(null, wrap))
        }
        const node = nodeType.create({},wrap)
        tr.insert(insertPos,node)
    } else {
        throw new Error("No path to textnode")
    }
    return tr             
}


export function createFragment( from, to, doc, schema ) {
    const $from = doc.resolve(from)
    const $to = doc.resolve(to)
    const startOffset = $from.start()
    const endOffset = $to.start()
    const startIndex = $from.index(-1)
    const endIndex = $to.index(-1)
    const boundingNode = $from.node(-1)
    const nodes = []

    function sliceText(node,start,end) {
        const texts = []
        for( let i=0; i < node.childCount; i++ ) {
            texts.push( node.child(i).text )
        }
        const text = texts.join('')
        const nextText = text.slice(start,end)
        const fragment = Fragment.from(schema.text(nextText))
        return schema.node(node.type, node.attrs, fragment )
    }

    for( let i=startIndex; i <= endIndex; i++ ) {
        let node = boundingNode.child(i)
        if( node.type.name === 'textNode' ) {
            if( i === startIndex && i === endIndex ) {
                const start = from - startOffset
                const end = to - endOffset
                node = sliceText(node,start,end)
            } else if( i === startIndex ) {
                const start = from - startOffset
                const end = undefined
                node = sliceText(node,start,end)                
            } else if( i === endIndex ) {
                const start = 0
                const end = to - endOffset + start
                node = sliceText(node,start,end)  
            }
        }
        nodes.push(node)
    }
    return Fragment.from(nodes)
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
    if( child.type.name === 'textNode' ) {
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
    return tr
}

function findMarkExtent(doc,mark,startPos,dir,endPos) {
    let result = -1

    let testFn //,range
    if( dir === -1 ) {
        testFn = (i) => (i >= endPos)
        // range = -(startPos-endPos)
    } else {
        testFn = (i) => (i <= endPos)
        // range = endPos-startPos
    }

    // TODO search tree recursively.
    // let testRange = Math.round(range/2)
    // doc.rangeHasMark( startPos, startPos+testRange, mark.type )

    for( let i=startPos; testFn(i); i+=dir ) {
        if( doc.rangeHasMark( i, i+1, mark.type ) ) {
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
    // let from = pos
    // let to = pos

    // walk from index in parent node backwards until we encounter text wo/this mark
    const backwards = findMarkExtent(doc,mark,pos-1,-1,parentStartPos)
    const from = (backwards !== -1 ) ? backwards : pos

    // for( let i=pos-1; i >= parentStartPos; i-- ) {
    //     if( doc.rangeHasMark( i, i+1, mark.type ) ) {
    //         from = i
    //     } else break
    // }

    // now walk forwards, doing the same thing
    const forwards = findMarkExtent(doc,mark,pos,1,parentEndPos-1)
    const to = (forwards !== -1 ) ? forwards : pos
    // for( let i=pos; i < parentEndPos; i++ ) {
    //     if( doc.rangeHasMark( i, i+1, mark.type ) ) {
    //         to = i+1
    //     } else break
    // }

    return { from, to }
}

export function createAsideNode( asideName, teiDocument, editorView ) {
    const { state } = editorView
    const subDocID = teiDocument.createSubDocument(document,asideName)
    return state.schema.node(asideName, { id: '', __id__: subDocID })
}