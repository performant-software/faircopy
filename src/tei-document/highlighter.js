import {Plugin, TextSelection} from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"
import {markExtent} from "./commands"

export function highlighter() {
    return new Plugin({
        props: {
          decorations: drawHighlight
        }
    })
}

// yellow scale
const heatMapColors = [
    "#FCFC01",
    "#E6E501",
    "#CCCC01"
]

// look at the selections in this state and highlight mark extents
const drawHighlight = function(state) { 
    const { doc, selection } = state

    // highlight ranges are not active when there's a browser selection
    const browserSelection = window.getSelection()
    if( !browserSelection.isCollapsed ) return 
    
    if( selection && selection instanceof TextSelection ) {
        const { $anchor } = selection
        const highlights = getHighlightRanges(doc, $anchor) 
        const decorations = []
        let i = 0
        for( const highlight of highlights ) {
            const {from,to} = highlight
            decorations.push(
                Decoration.inline(from, to, {style: `background: ${getHighlightColor(i++)}`})
            )
        }

        return DecorationSet.create(doc, decorations)
    }
}

export function getHighlightColor(idx) {
    return heatMapColors[idx % heatMapColors.length]
}

export function getHighlightRanges(doc, $anchor) {
    let highlights = []
    const marks = $anchor.marks()
    for( let mark of marks ) {
        highlights.push( { ...markExtent($anchor,mark,doc), mark } )
    }    
    // sort them left to right
    highlights = highlights.sort((a,b) => {
        if( a.from < b.from ) return -1
        if( a.from > b.from ) return 1
        return 0
    })
    return highlights
}

