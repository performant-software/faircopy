import { NodeSelection } from "prosemirror-state"
import { Node, Fragment } from "prosemirror-model"
import { createValidNode } from "./element-validators"

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


export function insertAtomNodeAt(elementID, attrs, pos, schema, elements, insertType, tr, createSubDocument ) {
    const { doc } = tr
    const { fcType } = elements[elementID]
    const nodeType = schema.nodes[elementID]
    const offset = insertType === 'below' ? 1 : (fcType === 'asides' ) ? (insertType === 'inside') ? -1 : 1 : -1
    let node

    if( fcType === 'asides' ) {
        const subDocID = createSubDocument(document,elementID,attrs)
        node = nodeType.create({ id: '', __id__: subDocID, ...attrs })
    } else {
        node = nodeType.create(attrs)
    }

    const $prev = doc.resolve(pos+offset)

    // if there's already a globalNode, insert within it.
    if( $prev && $prev.parent && $prev.parent.type.name.includes('globalNode') ) {            
        tr.insert(pos+offset,node)
    } else {
        tr.insert(pos,node)
    }
    return tr
}

export function insertNodeAt( elementID, attrs, insertPos, schema, elements, tr, createSubDocument ) {
    const validNode = createValidNode(elementID,attrs,Fragment.empty,schema,elements, null, createSubDocument )
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

export function deleteParentNode(pos, tr) {
    const $pos = tr.doc.resolve(pos)
    const node = $pos.node().child($pos.index())
    const grandParentNode = $pos.node()

    // need to have a grand parent to adopt children
    if(!grandParentNode) return tr

    const greatNodes = [], children = []
    for( let i=0; i < grandParentNode.childCount; i++ ) {
        const child = grandParentNode.child(i)
        if( child === node ) {
            // always have at least one child so we can have a textnode below it
            if( grandParentNode.childCount === 1 || !isBlank(node) ) {
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

    // first, try to promote the children to replace the node
    if( grandParentNode.type.validContent(Fragment.fromArray(greatNodes)) ) {
        tr.replaceWith(pos,pos+node.nodeSize,children) 
    } 
    else {
        const greatNodesWithoutNode = []
        for( let i=0; i < grandParentNode.childCount; i++ ) {
            const child = grandParentNode.child(i)
            if( child !== node ) greatNodesWithoutNode.push(child)
        }
        // delete the node if it is valid to do so, don't leave parent node empty
        if( greatNodesWithoutNode.length > 0 && grandParentNode.type.validContent(Fragment.fromArray(greatNodesWithoutNode)) ) {
            tr.delete(pos,pos+node.nodeSize)
        } else {
            tr.setMeta('alertMessage', "You must delete this element's parent to delete it.")
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

export function gatherMarkSets(softNode) {
    const markSets = []

    softNode.descendants((node) => {    
        if( node.type.name === 'text' ) {
            markSets.push( { marks: node.marks, text: node.text } )
        }        
    })

    return markSets
}

export function depthToLast(node,type,depth=0) {
    if( node.type.name === type ) return { node, depth }
    if( node.childCount === 0 ) return { node: null, depth: 0 }
    return depthToLast(node.lastChild,type,depth+1) 
}

export function fragmentWithout(fragment, node) {
    const childNodes = []
    for( let i=0; i<fragment.childCount; i++) {
      const child = fragment.child(i)
      if( child !== node ) {
        childNodes.push(child)
      }
    }
    return Fragment.from(childNodes)
}