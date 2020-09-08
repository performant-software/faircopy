const { getKeys } = require("./parse-util")


function parseGroup(groupEl) {
    if( groupEl.nodeName === 'classRef' ) {
        return groupEl.getAttribute('key')
    }
}

function decodeContent( contentEl ) {
    const contentType = ( contentEl.nodeName === 'sequence' || contentEl.nodeName === 'alternate' ) ? contentEl.nodeName : 
        ( contentEl.nodeName === 'classRef' ) ? 'group' : null

    if( contentType ) {
        const contentArray = []
        if( contentType === 'group' ) {
            contentArray.push( parseGroup(contentEl) )
        } else {
            const children = contentEl.children
            for( let i=0; i < children.length; i++ ) {
                const childEl = children.item(i)
                contentArray.push( decodeContent(childEl) )
            }        
        }
        return {
            type: contentType,
            content: contentArray
        }
    }
    return null
}

// take the completed content array and turn it into a content string
function encodeContent( content ) {
    if( !content ) return ''
    
    if( content.type === 'sequence' ) {
        const seqItems = []
        for( const item of content.content ) {
            seqItems.push(encodeContent(item))
        }
        return seqItems.join(' ')
    }
    if( content.type === 'alternate' ) {
        const altItems = []
        for( const item of content.content ) {
            altItems.push(encodeContent(item))
        }
        return `(${altItems.join('|')})`
    }
    if( content.type === 'group' ) {
        return content.content
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
            // tranform ODD XML description of content into a ProseMirror content expression
            const content = decodeContent(rootEl)
            if( content ) {
                return encodeContent(content)
            }    
        }
    }
    return ""
}


const parseGroups = function parseGroups(memberships) {
    const groups = []

    for( const membership of memberships ) {
        if( membership.startsWith('model.') ) {
            groups.push(membership)
        }
    }

    return groups.join(' ')
}


// EXPORTS /////////////
module.exports.parseContent = parseContent
module.exports.parseGroups = parseGroups