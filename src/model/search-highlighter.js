import {Plugin } from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"

const searchHighlightColor = '#8dff50'

export function searchHighlighter() {
    let plugin = new Plugin({
        state: {
            init() { return { searchQuery: '', searchResults: []} },
            apply(tr,oldState) { 
                const newResults = tr.getMeta('searchResults')
                const searchQuery = tr.getMeta('searchQuery')
                const searchResults = ( newResults === -1 ) ? [] : newResults
                return newResults ? { searchQuery, searchResults } : oldState
            }
        },
        props: {
            decorations: drawHighlight
        }
    })

    // highlight the search results
    function drawHighlight(state) { 
        const { doc } = state
        const pluginState = plugin.getState(state)
        const { searchQuery, searchResults } = pluginState
        const terms = searchQuery.toLowerCase().split(' ')
        let resultsInvalid = false

        if( searchResults.length > 0 ) {
            const decorations = []
            for( const nodePos of searchResults ) {
                const $node = doc.resolve(nodePos+1)
                const parentNode = $node.parent

                // find an exact match to the search query and highlight it
                // eslint-disable-next-line no-loop-func
                parentNode.descendants( (node,pos) => {
                    if( node.type.name.includes('textNode') ) {
                        try {
                            const from = nodePos+pos
                            const to = from + node.nodeSize
                            const text = doc.textBetween(from,to, ' ', ' ')
                            for( const term of terms ) {
                                const textOffset = text.indexOf(term)
                                if( textOffset !== -1 ) {
                                    // highlight the matching term
                                    const termFrom = nodePos+pos+textOffset+2
                                    const termTo = termFrom + term.length
                                    decorations.push(Decoration.inline(termFrom, termTo, {style: `background: ${searchHighlightColor}`}))
                                }
                            }    
                        } catch(e) {
                            // If the user edits the document, it can invalid the search results by moving the offsets around.
                            // In this case, clear the highlights.
                            resultsInvalid = true
                        }
                        return false
                    }
                    return true
                })
            }

            if( resultsInvalid ) {
                return DecorationSet.create(doc, [])
            } else {
                return DecorationSet.create(doc, decorations)
            }            
        }
    }

    return plugin
}