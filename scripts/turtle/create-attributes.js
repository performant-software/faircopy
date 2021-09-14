const {getAllElements} = require('./parse-util')

const createAttributes = function createAttributes( elements, elementGroups, specs ) {

    function mergeAttrs( baseAttrs, changedAttrs ) {
        const mergedAttrs = { ...baseAttrs }
        for( const key of Object.keys(changedAttrs) ) {
            if( changedAttrs[key] !== null ) mergedAttrs[key] = changedAttrs[key]
        }
        return mergedAttrs
    }

    function getValidElementName(element) {
        // for synthetic elements, only add attributes to inter marks
        if( element.synth ) {
            const markPrefix = 'mark'
            const name = element.name
            return name.startsWith(markPrefix) ? name.slice(markPrefix.length) : null
        } 
        return null
    }

    // for each element, add the attrs to its list of possible attrs
    const findAttrs = (specIdent) => {
        const elSpec = specs[specIdent]
        let classAttrs = []

        if( elSpec.memberships ) {
            for( const membership of elSpec.memberships ) {                
                classAttrs = classAttrs.concat( findAttrs( membership ) )
            }    
        }

        const elementAttrs = elSpec.attrs ? [ ...elSpec.attrs ] : []
        return classAttrs.concat( elementAttrs )
    }

    const attrDefs = {}

    const validElements = getAllElements(elementGroups)

    // create a global dictionary of attr definitions and record attrs for each element
    for( const element of elements ) {
        const elementName = validElements.includes(element.name) ? element.name : getValidElementName(element)
        if( !elementName ) continue

        const attrs = findAttrs(elementName)
        const validAttrs = [], derivedAttrs = []
        for( const attr of attrs ) {
            // if this is an attrRef, find the referenced attribute and include that
            if( attr.ref ) {
                if( !attrDefs[attr.name] ) {
                    const elSpec = specs[attr.attClass]
                    const attrRef = elSpec.attrs.find( attr => attr.ident === attr.name )
                    attrDefs[attrRef.ident] = attrRef
                }
                validAttrs.push(attr.name)
            } else {
                // interpret mode attribute based on https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-att.combinable.html
                if( !attrDefs[attr.ident] ) {
                    if( attr.mode === 'change' ) throw new Error(`Attribute definition changed before it was defined for ${attr.ident} in ${elementName}.`)
                    attrDefs[attr.ident] = attr
                    validAttrs.push( attr.ident )
                } else if( attr.mode === 'change' ) {
                    // this is a definition of this attribute specific to this element
                    const mergedAttrDef = mergeAttrs( attrDefs[attr.ident], attr )
                    const mergeIdent = `${attr.ident}-${elementName}`
                    derivedAttrs.push( attr.ident )
                    attrDefs[mergeIdent] = mergedAttrDef
                } else if( attr.mode === 'delete') {
                    const origIndex = validAttrs.findIndex( ident => ident === attr.ident )
                    if( origIndex !== -1 ) validAttrs.splice(origIndex,1)
                } else {
                    validAttrs.push( attr.ident )
                }
            }
        }
        element.validAttrs = validAttrs.sort()
        element.derivedAttrs = derivedAttrs.sort()
    }

    // These attributes are treated specially
    attrDefs['xml:id'].hidden = true
    attrDefs['xml:base'].hidden = true

    return attrDefs
}

// EXPORTS /////////////
module.exports.createAttributes = createAttributes
