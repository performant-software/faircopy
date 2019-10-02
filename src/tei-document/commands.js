import { NodeSelection } from "prosemirror-state"

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
                let has = false, tr = state.tr
                for (let i = 0; !has && i < ranges.length; i++) {
                    let {$from, $to} = ranges[i]
                    has = state.doc.rangeHasMark($from.pos, $to.pos, markType)
                }
                for (let i = 0; i < ranges.length; i++) {
                    let {$from, $to} = ranges[i]
                    tr.addMark($from.pos, $to.pos, markType.create(attrs))
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
        tr.setSelection( NodeSelection.create(tr.doc, pos) )
    } else {            
        $anchor.parent.descendants( (node) => {
            const {marks} = node
            if( marks.includes(element) ) {
                const nextMark = element.type.create( newAttrs )
                const from = pos - $anchor.textOffset
                const to = from + node.textContent.length
                tr.removeMark(from,to,element)
                tr.addMark(from,to,nextMark)
            }
        })
    }
    return tr
}
