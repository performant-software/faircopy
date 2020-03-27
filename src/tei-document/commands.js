import { NodeSelection, TextSelection } from "prosemirror-state"
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

export function addMark(markType, attrs) {
    return function(state, dispatch) {
        let {empty, $cursor, ranges} = state.selection
        if ((empty && !$cursor) || !markApplies(state.doc, ranges, markType)) return false
        if (dispatch) {
            if ($cursor) {
                dispatch(state.tr.addStoredMark(markType.create(attrs)))
            } else {
                const {tr} = state
                for (let i = 0; i < ranges.length; i++) {
                    let {$from, $to} = ranges[i]
                    tr.addMark($from.pos, $to.pos, markType.create(attrs))
                    // change the range to a cursor at the end of the first range
                    if( i === 0 ) {
                        const cursorPos = tr.doc.resolve($to.pos)
                        tr.setSelection(new TextSelection(cursorPos,cursorPos))                
                    }
                }
                dispatch(tr.scrollIntoView())
            }
        }
        return true
    }
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
    const {pos} = $anchor
    let newAttrs = { ...element.attrs }
    newAttrs[attributeKey] = value
    if( element instanceof Node ) {
        tr.setNodeMarkup(pos, undefined, newAttrs)
        const nextNode = NodeSelection.create(tr.doc, pos)
        tr.setSelection( nextNode )
        return nextNode
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
