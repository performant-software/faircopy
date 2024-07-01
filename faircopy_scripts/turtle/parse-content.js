
function parseGroup(groupEl) {
    const {nodeName} = groupEl
    if( nodeName === 'classRef' || nodeName === 'elementRef' ) {
        const key = groupEl.getAttribute('key')
        return key.replace(/\./g,'_')
    }
    if( nodeName === 'textNode' ) {
        return 'textNode'
    }
    // return null for the 'empty' nodeName and all unsupported elements
    return null
}

// @expand in classRef (https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-classRef.html)
// is only used a few times in the whole TEI specification. Hacked in support for now.
function hackExpandedClassRef(key,expand) {
    if( expand !== 'sequenceOptional' && expand !== 'sequence' ) throw new Error(`Unsupported expand mode: ${expand} for ${key}.`)

    const g = (key) => { return { 
        type: 'group',
        content: [key],
        minOccurs: expand === 'sequenceOptional' ? 0 : 1,
        maxOccurs: 1
    }}

    if( key === 'model.placeNamePart' ) {
        return [ g("placeName"), g("bloc"), g("country"), g("region"), g("settlement"), g("district"), g("geogName") ]
    } else if( key === 'model.physDescPart') {
        return [ g("objectDesc"), g("handDesc"), g("typeDesc"), g("scriptDesc"), g("musicNotation"), g("decoDesc"), g("additions"), g("bindingDesc"), g("sealDesc"), g("accMat") ]
    } else if( key === 'model.textDescPart' ) {
        return [ g("channel"), g("constitution"), g("derivation"), g("domain"), g("factuality"), g("interaction"), g("preparedness") ]
    }
    else {
        throw new Error(`New case discovered that isn't covered by hackExpandedClassRef(): ${key}`)
    }
}

function decodeContent( contentEl ) {
    const { nodeName } = contentEl
    const expand = contentEl.getAttribute('expand')
    const contentType = ( nodeName === 'sequence' || nodeName === 'alternate' ) ? nodeName : ( nodeName === 'classRef' && expand ) ? 'sequence' : 'group'

    const minOccursVal  = expand === 'sequenceOptional' ? 0 : expand === 'sequence' ? 1 : contentEl.getAttribute('minOccurs')
    const maxOccursVal = expand ? 1 : contentEl.getAttribute('maxOccurs')
    const minOccurs = ( minOccursVal === null ) ? 1 : Number(minOccursVal)
    const maxOccurs = ( maxOccursVal === null ) ? 1 : (maxOccursVal === "unbounded" ) ? '∞' : Number(maxOccursVal)

    let contentArray = []
    if( contentType === 'group' ) {
        const group = parseGroup(contentEl)
        if( !group ) return null
        contentArray.push( group )
    } else {
        if( !expand ) {
            const children = contentEl.children
            for( let i=0; i < children.length; i++ ) {
                const childEl = children.item(i)
                contentArray.push( decodeContent(childEl) )
            }  
        } else {
            contentArray = hackExpandedClassRef(contentEl.getAttribute('key'),expand)
        }              
    }
    return {
        type: contentType,
        content: contentArray,
        minOccurs,
        maxOccurs
    }
}

function encodeOccurence( content ) {
    const { minOccurs, maxOccurs } = content

    if( minOccurs === 1 && maxOccurs === 1 ) return ''
    if( minOccurs === 0 && maxOccurs === 1 ) return '?'

    if( maxOccurs === '∞' ) {
        if( minOccurs === 0 ) return '*'
        if( minOccurs === 1 ) return '+'
        return `{${minOccurs},}`
    } else {
        if( minOccurs === maxOccurs ) return `{${minOccurs}}`
        return `{${minOccurs}, ${maxOccurs}}`
    }
}

// turn content array into mark group list
const encodeMarkContent = function encodeMarkContent( content ) {
    if( !content ) return ''
    
    if( content.type === 'alternate' ) {
        const altItems = []
        for( const item of content.content ) {
            altItems.push(item.content)
        }
        return altItems.join(' ')
    }
    return ''
}

// take the completed content array and turn it into a content string
const encodeContent = function encodeContent( content, suffix='', suffixSet=null ) {
    if( !content ) return ''

    const occurs = encodeOccurence(content)
    
    if( content.type === 'sequence' ) {
        const seqItems = []
        for( const item of content.content ) {
            seqItems.push(encodeContent(item,suffix,suffixSet))
        }
        return `(${seqItems.join(' ')})${occurs}`
    }
    if( content.type === 'alternate' ) {
        const altItems = []
        for( const item of content.content ) {
            altItems.push(encodeContent(item,suffix,suffixSet))
        }
        return `(${altItems.join('|')})${occurs}`
    }
    if( content.type === 'group' ) {
        // only add the suffix if group is a member of suffix set (or if set is not provided)
        if( !suffixSet || suffixSet.includes( content.content[0] ) ) {
            return `${content.content}${suffix}${occurs}`
        } else {
            return `${content.content}${occurs}`
        }
    }    
    return ''
}

const parseContent = function parseContent( contentEl ) {
    if( contentEl.children.length === 1 ) {
        const rootEl = contentEl.children.item(0)
        // if it is a macro, will be resolved later
        if( rootEl.nodeName === 'macroRef' ) {
            return rootEl.getAttribute('key')
        } else {
            // transform ODD XML description of content into a ProseMirror content expression
            return decodeContent(rootEl)
        }
    }
    // return null (empty content) for unsupported content
    return null
}

const parseGroups = function parseGroups(specs) {

    function findModels( model ) {
        const models = []
        const memberships = specs[model].memberships
        if( memberships ) {
            for( const membership of memberships ) {
                if( membership.startsWith('model.') ) {
                    models.push( ...findModels(membership), membership)
                }
            }    
        }
        return models
    }

    for( const spec of Object.values(specs) ) {
        const { ident } = spec
        // group only needed for element specs 
        if( !ident.startsWith('att.') && !ident.startsWith('macro.') && !ident.startsWith('model.') ) {
            const groups = findModels(ident)
            const groupExpression = groups.join(' ').replace(/\./g,'_')
            spec.group = groupExpression
        }
    }
}


// EXPORTS /////////////
module.exports.parseContent = parseContent
module.exports.parseGroups = parseGroups
module.exports.encodeContent = encodeContent
module.exports.encodeMarkContent = encodeMarkContent