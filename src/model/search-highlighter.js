import {Plugin } from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"

export function searchHighlighter() {
    let plugin = new Plugin({
        state: {
            init() { return [] },
            apply(tr,oldResults) { 
                const newResults = tr.getMeta('searchResults')
                if( newResults === -1 ) return []
                return newResults ? newResults : oldResults
            }
        },
        props: {
            decorations: drawHighlight
        }
    })

    // highlight the search results
    function drawHighlight(state) { 
        const { doc } = state
        const results = plugin.getState(state)

        if( results && results.length > 0 ) {
            const decorations = []
            for( const result of results ) {
                const from = result
                const $from = doc.resolve(from+1)
                const len = $from.parent.nodeSize
                const to = from + len
                decorations.push(
                    Decoration.inline(from, to, {style: `background: #8dff50`})
                )
            }

            return DecorationSet.create(doc, decorations)
        }
    }

    return plugin
}

