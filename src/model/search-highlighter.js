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

        if( searchResults.length > 0 ) {
            const decorations = []
            for( const nodePos of searchResults ) {
                const $node = doc.resolve(nodePos+1)
                const parentNode = $node.parent

                // find an exact match to the search query and highlight it
                parentNode.descendants( (node,pos) => {
                    if( node.text ) {
                        // find whole word matches, ignoring spaces, punctuation, and possessive
                        for( const term of terms ) {
                            const nodeTerms = node.textContent.toLowerCase().split(' ')
                            let offset = 0
                            for( const nodeTerm of nodeTerms ) {
                                const regex = new RegExp(`^\\W*${term}\\W*\\w*$`)
                                if( nodeTerm.match(regex) ) {
                                    // highlight the matching term
                                    const termFrom = nodePos+pos+offset+1
                                    const termTo = termFrom + term.length
                                    decorations.push(Decoration.inline(termFrom, termTo, {style: `background: ${searchHighlightColor}`}))
                                }
                                offset = offset + nodeTerm.length+1
                            }
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

