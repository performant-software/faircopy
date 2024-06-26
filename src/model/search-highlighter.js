import {Plugin, PluginKey } from "prosemirror-state"
import {DecorationSet, Decoration } from "prosemirror-view"
import { gatherMarkSets } from "./commands"

const searchHighlightColor = '#D4FFBC'
const selectedHighlightColor = '#8dff50'
const markPrefix = 'mark'

export function searchHighlighter() {
    let plugin = new Plugin({
        key: new PluginKey('searchHighlighter'),
        state: {
            init() { return { highlights: [], selectionIndex: 0} },
            apply(tr,oldState) { 
                const newResults = tr.getMeta('searchResults')
                const searchQuery = tr.getMeta('searchQuery')
                const selectionIndex = tr.getMeta('selectionIndex')
                const searchResults = ( newResults === -1 ) ? [] : newResults
                if( searchResults ) {
                    const highlights = generateHighlights(searchQuery, searchResults, tr.doc)
                    return { highlights, selectionIndex }
                } else if( typeof selectionIndex !== 'undefined' ) {
                    return { highlights: oldState.highlights, selectionIndex }
                } else {
                    return oldState
                }
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
        const { highlights, selectionIndex } = pluginState

        const decorations = []
        for( let i=0; i < highlights.length; i++ ) {
            const { from, to } = highlights[i]
            const backgroundColor = i === selectionIndex ? selectedHighlightColor : searchHighlightColor
            decorations.push(Decoration.inline(from, to, {style: `background: ${backgroundColor}`}))
        }

        return DecorationSet.create(doc, decorations)
    }

    return plugin
}

function generateHighlights(searchQuery, searchResults, doc) {
    let resultsInvalid = false
    const highlights = []

    // if there's no search query, clear the highlights
    if( searchResults.length === 0 ) return []
  
    // add only unique highlight ranges
    function addHighlight(highlight) {
        if( !highlights.find( h => h.from === highlight.from && h.to === highlight.to )) {
            highlights.push(highlight)
        }
    }

    const queryLowerCase = searchQuery.query.toLowerCase().trim()
    
    if( queryLowerCase.length > 0 ) {
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
                        const text = doc.textBetween(from,to, ' ', ' ').toLowerCase()
                        const textOffset = text.indexOf(queryLowerCase)
                        if( textOffset !== -1 ) {
                            // highlight the matching term
                            const termFrom = nodePos+pos+textOffset+2
                            const termTo = termFrom + queryLowerCase.length
                            // if the result is a mark, see if there's matching mark at this location
                            if( elementType === 'mark' ) {
                                const markSets = gatherMarkSets(node)
                                if( matchingMark(termFrom,searchQuery,doc,markSets) ) {
                                    addHighlight({ from: termFrom, to: termTo })
                                }    
                            } else {
                                addHighlight({ from: termFrom, to: termTo })
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
    }
    if( resultsInvalid ) {
        return []
    } else {
        return highlights.sort( (a,b) => a.from - b.from ) 
    }            
}

function matchingMark( pos, searchQuery, doc, markSets ) {
    const { elementName, attrQs } = searchQuery

    for( const markSet of markSets ) {
        const { marks } = markSet
        const mark = marks.find( mark => {
            const markName = mark.type.name
            const elName = markName.startsWith(markPrefix) ? markName.slice(markPrefix.length) : markName
            // does this mark match the elementName if given?
            if( elementName.length > 0 && elementName !== elName ) return false
            // does it match all the attribute queries?
            for( const attrQ of attrQs ) {
                const { name, value } = attrQ
                if( mark.attrs[name] !== value ) return false
            }
            // does this mark extend over this position?
            return doc.rangeHasMark( pos, pos+1, mark ) 
        })  
        if( mark ) return mark  
    }
    return null
}