import {Plugin} from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"

// TODO have a configurable style prop
export function highlighter() {
    return new Plugin({
        props: {
          decorations: drawHighlight
        }
    })
}

// look at the selections in this state and highlight mark extents
const drawHighlight = function(state) { 
    const { doc, selection } = state

    if( selection ) {
        const { $anchor } = selection

        const decorations = []
        const marks = $anchor.marks()
        for( let mark of marks ) {
            // TODO this could be a heat map of the selection overlaps
            const extent = markExtent($anchor,mark,doc)
            decorations.push(
                Decoration.inline(extent.from, extent.to, {style: "background: yellow"})
            )
        }    
        return DecorationSet.create(doc, decorations)
    }
}

function markExtent($anchor, mark, doc) {
    // TODO - figure out the range of this mark in either

    // find the parent node and note its length
    // walk from index in parent node backwards and forwards until we encounter text wo/this mark
    // do not pass node boundaries on either side
    const parentNode = $anchor.parent
    const pos = $anchor.pos
    const parentStartPos = pos - $anchor.parentOffset
    const parentEndPos = parentStartPos + parentNode.nodeSize
    let from = pos
    let to = pos

    for( let i=pos-1; i > parentStartPos; i-- ) {
        if( doc.rangeHasMark( i, i+1, mark.type ) ) {
            from = i
        } else break
    }

    for( let i=pos; i < parentEndPos; i++ ) {
        if( doc.rangeHasMark( i, i+1, mark.type ) ) {
            to = i
        } else break
    }

    return { from, to }
}