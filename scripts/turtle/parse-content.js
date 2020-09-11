
function parseGroup(groupEl) {
    const {nodeName} = groupEl
    if( nodeName === 'classRef' || nodeName === 'elementRef' ) {
        return groupEl.getAttribute('key').replace(/\./g,'_')
    }
    if( nodeName === 'textNode' ) {
        return 'textNode'
    }
    // return null for the 'empty' nodeName and all unsupported elements
    return null
}

function decodeContent( contentEl ) {
    const contentType = ( contentEl.nodeName === 'sequence' || contentEl.nodeName === 'alternate' ) ? contentEl.nodeName : 'group'

    const minOccursVal  = contentEl.getAttribute('minOccurs')
    const maxOccursVal = contentEl.getAttribute('maxOccurs')
    const minOccurs = ( minOccursVal === null ) ? 1 : Number(minOccursVal)
    const maxOccurs = ( maxOccursVal === null ) ? 1 : (maxOccursVal === "unbounded" ) ? '∞' : Number(maxOccursVal)

    const contentArray = []
    if( contentType === 'group' ) {
        const group = parseGroup(contentEl)
        if( !group ) return null
        contentArray.push( group )
    } else {
        const children = contentEl.children
        for( let i=0; i < children.length; i++ ) {
            const childEl = children.item(i)
            contentArray.push( decodeContent(childEl) )
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

// take the completed content array and turn it into a content string
const encodeContent = function encodeContent( content ) {
    if( !content ) return ''

    const occurs = encodeOccurence(content)
    
    if( content.type === 'sequence' ) {
        const seqItems = []
        for( const item of content.content ) {
            seqItems.push(encodeContent(item))
        }
        return `(${seqItems.join(' ')})${occurs}`
    }
    if( content.type === 'alternate' ) {
        const altItems = []
        for( const item of content.content ) {
            altItems.push(encodeContent(item))
        }
        return `(${altItems.join('|')})${occurs}`
    }
    if( content.type === 'group' ) {
        return `${content.content}${occurs}`
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