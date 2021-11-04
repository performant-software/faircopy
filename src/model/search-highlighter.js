import {Plugin } from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"
import { markExtent, gatherMarks } from "./commands"

const searchHighlightColor = '#8dff50'
const markPrefix = 'mark'

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
        const emptySet = DecorationSet.create(doc, [])

        if( !searchQuery ) return emptySet

        const terms = searchQuery.query.toLowerCase().split(' ')
        let resultsInvalid = false

        if( searchResults.length > 0 ) {
            const decorations = []
            for( const searchResult of searchResults ) {
                const { pos: nodePos, elementType } = searchResult
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
                                    // if the result is a mark, see if there's matching mark at this location
                                    if( elementType === 'mark' ) {
                                        const marks = gatherMarks(node)
                                        if( marks.length > 0 ) {
                                            const markMatch = matchingMark(termFrom,searchQuery,doc,marks)
                                            if( markMatch ) {
                                                decorations.push(Decoration.inline(markMatch.from, markMatch.to, {style: `background: ${searchHighlightColor}`}))
                                            }    
                                        }
                                    } else {
                                        decorations.push(Decoration.inline(termFrom, termTo, {style: `background: ${searchHighlightColor}`}))
                                    }
                                }
                            }    
                        } catch(e) {
                            // If the user edits the document, it can invalidate the search results by moving the offsets around.
                            // In this case, clear the highlights.
                            resultsInvalid = true
                            console.log(e)
                        }
                        return false
                    }
                    return true
                })
            }

            if( resultsInvalid ) {
                return emptySet
            } else {
                return DecorationSet.create(doc, decorations)
            }            
        }
    }

    return plugin
}

function matchingMark( pos, searchQuery, doc, marks ) {
    const { elementName, attrQs } = searchQuery

    const mark = marks.find( m => {
        const markName = m.type.name
        const elName = markName.startsWith(markPrefix) ? markName.slice(markPrefix.length) : markName
        if( elementName.length > 0 && elementName !== elName ) return false
        for( const attrQ of attrQs ) {
            const { name, value } = attrQ
            if( m.attrs[name] !== value ) return false
        }
        return true
    })

    if( mark ) {
        const $pos = doc.resolve(pos)
        return  markExtent($pos, mark, doc)
    }
    return null
}