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
            const extent = markExtent($anchor,mark)
            decorations.push(
                Decoration.inline(extent.from, extent.to, {style: "background: yellow"})
            )
        }    
        return DecorationSet.create(doc, decorations)
    }
}

function markExtent($anchor, mark) {
    // TODO - figure out the range of this mark in either
}