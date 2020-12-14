
const createAttributes = function createAttributes( elements, specs ) {

    function getElementName(name) {
        const markPrefix = 'mark'
        return name.startsWith(markPrefix) ? name.slice(markPrefix.length) : name
    }

    // for each element, add the attrs to its list of possible attrs
    const findAttrs = (specIdent) => {
        const elSpec = specs[specIdent]
        let elementAttrs = elSpec.attrs ? [ ...elSpec.attrs ] : []

        if( elSpec.memberships ) {
            for( const membership of elSpec.memberships ) {                
                elementAttrs = elementAttrs.concat( findAttrs( membership ) )
            }    
        }
        return elementAttrs
    }

    const attrDefs = {}

    // create a global dictionary of attr definitions and record attrs for each element
    for( const element of elements ) {
        // skip over special prosemirror root node
        if( element.name === 'doc' || element.name === 'noteDoc' || element.name === 'noteX') continue
        const elementName = getElementName(element.name)
        const attrs = findAttrs(elementName)
        const validAttrs = []
        for( const attr of attrs ) {
            if( !attrDefs[attr.ident] ) {
                attrDefs[attr.ident] = attr
            }
            validAttrs.push( attr.ident )
        }
        element.validAttrs = validAttrs.sort()
    }

    // convert attr definitions into FairCopy data format
    const attrs = {}
    for( const attr of Object.values(attrDefs) ) {
        attrs[attr.ident] = {
            ...attr,
        }
    }

    // These attributes are treated specially
    attrs['xml:id'].hidden = true
    attrs['xml:base'].hidden = true

    return attrs
}

// EXPORTS /////////////
module.exports.createAttributes = createAttributes
