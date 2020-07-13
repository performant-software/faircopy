import { TextSelection, NodeSelection } from "prosemirror-state"
import { Node } from "prosemirror-model"

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

// Prevent creating overlapping hierarchies which are invalid in XML
function preventOverlap( doc, markType, $from, $to ) {   
    const parentNode = $from.parent
    let from = $from.pos
    const parentStartPos = from - $from.parentOffset
    const parentEndPos = parentStartPos + parentNode.nodeSize
    let end = ($to.pos > parentEndPos) ? parentEndPos : $to.pos

    let firstMarkPos = null, firstMark = null

    // first pass: detect marks of markType in this range, adjust bounds to absorb these
    for( let i=from; i < end; i++ ) {
        const $cursor = doc.resolve(i)
        const marks = $cursor.marks()
        for( const mark of marks ) {
            if( mark.type === markType ) {
                const extent = markExtent($cursor, mark, doc)
                from = extent.from < from ? extent.from : from
                end = extent.to > end ? extent.to : end
                if( !firstMarkPos || extent.from < firstMarkPos ) {
                    firstMark = mark
                    firstMarkPos = extent.from
                }
            }
        }
    }    

    // if we found a mark of this type, use its attrs instead
    const attrs = (firstMarkPos) ? firstMark.attrs : null

    let to

    // second pass: detect overlap with from to end range
    for( to=from; to < end; to++ ) {
        const $cursor = doc.resolve(to)
        const marks = $cursor.marks()
        for( const mark of marks ) {
            const extent = markExtent($cursor, mark, doc)
            if( extent.from < from && extent.to < end) {
                // overlap found: clip range
                debugger
                return { from, to: extent.to } 
            }
            if( extent.from > from && extent.to > end) {
                // overlap found: clip range
                debugger
                return { from, to: extent.from } 
            }
        }
    }

    // no overlap with existing marks
    debugger
    return { from, to, attrs }
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

export function changeAttribute( element, attributeKey, value, $anchor, tr ) {
    let newAttrs = { ...element.attrs }
    newAttrs[attributeKey] = value
    if( element instanceof Node ) {
        const {pos} = $anchor
        tr.setNodeMarkup(pos,element.type,newAttrs)
        const selection = NodeSelection.create(tr.doc, pos)
        tr.setSelection( selection )
        return element
    } else {
        const { from, to } = markExtent($anchor,element,tr.doc)
        const nextMark = element.type.create( newAttrs )
        tr.removeMark(from,to,element)
        tr.addMark(from,to,nextMark)
        return nextMark
    }
}

export function markExtent($anchor, mark, doc) {
    const parentNode = $anchor.parent
    const pos = $anchor.pos
    const parentStartPos = pos - $anchor.parentOffset
    const parentEndPos = parentStartPos + parentNode.nodeSize
    let from = pos
    let to = pos

    // walk from index in parent node backwards until we encounter text wo/this mark
    for( let i=pos-1; i >= parentStartPos; i-- ) {
        if( doc.rangeHasMark( i, i+1, mark.type ) ) {
            from = i
        } else break
    }

    // now walk forwards, doing the same thing
    for( let i=pos; i < parentEndPos; i++ ) {
        if( doc.rangeHasMark( i, i+1, mark.type ) ) {
            to = i+1
        } else break
    }

    return { from, to }
}
