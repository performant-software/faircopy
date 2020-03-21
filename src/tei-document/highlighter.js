import {Plugin} from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"
import {markExtent} from "./commands"

// TODO have a configurable style prop
export function highlighter() {
    return new Plugin({
        props: {
          decorations: drawHighlight
        }
    })
}

export const heatMapColors = [
    "#FCFC01",
    "#E6E501",
    "#CCCC01"
]

// look at the selections in this state and highlight mark extents
const drawHighlight = function(state) { 
    const { doc, selection } = state

    if( selection ) {
        const { $anchor } = selection

        const decorations = []
        const marks = $anchor.marks()
        for( let mark of marks ) {
            // TODO this could be a heat map of the selection overlaps
            const {from,to} = markExtent($anchor,mark,doc)
            decorations.push(
                Decoration.inline(from, to, {style: `background: ${heatMapColors[0]}`} )
            )
        }    
        return DecorationSet.create(doc, decorations)
    }
}

