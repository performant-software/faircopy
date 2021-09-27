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

        if( searchResults.length > 0 ) {
            const decorations = []
            for( const nodePos of searchResults ) {
                const $node = doc.resolve(nodePos+1)
                const parentNode = $node.parent

                // find an exact match to the search query and highlight it
                parentNode.descendants( (node,pos) => {
                    if( node.text ) {
                        const offset = node.textContent.toLowerCase().indexOf(searchQuery.toLowerCase())
                        if( offset !== -1 ) {
                            const phraseFrom = nodePos+pos+offset+1
                            const phraseTo = phraseFrom + searchQuery.length
                            decorations.push(Decoration.inline(phraseFrom, phraseTo, {style: `background: ${searchHighlightColor}`}))
                        }
                        return false
                    }
                    return true
                })
            }

            return DecorationSet.create(doc, decorations)
        }
    }

    return plugin
}

