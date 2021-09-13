const {getAllElements} = require('./parse-util')

const createAttributes = function createAttributes( elements, elementGroups, specs ) {

    function mergeAttrs( baseAttrs, changedAttrs ) {
        const mergedAttrs = { ...baseAttrs }
        for( const key of Object.keys(changedAttrs) ) {
            if( changedAttrs[key] !== null ) mergedAttrs[key] = changedAttrs[key]
        }
        return mergedAttrs
    }

    function replaceEntry( originalIdent, newIdent, indentList ) {
        const origIndex = indentList.findIndex( ident => ident === originalIdent )
        if( origIndex === -1 ) return
        if( newIdent ) { 
            indentList.splice(origIndex,1,newIdent)
        } else {
            indentList.splice(origIndex,1)
        }
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
        const validAttrs = [], requiredAttrs = []
        for( const attr of attrs ) {
            // interpret mode attribute based on https://tei-c.org/release/doc/tei-p5-doc/en/html/ref-att.combinable.html
            if( !attrDefs[attr.ident] ) {
                if( attr.mode === 'change' ) throw new Error(`Attribute definition changed before it was defined for ${attr.ident} in ${elementName}.`)
                attrDefs[attr.ident] = attr
                validAttrs.push( attr.ident )
                if( attr.usage === 'req' ) requiredAttrs.push( attr.ident )    
            } else if( attr.mode === 'change' ) {
                // this is a definition of this attribute specific to this element
                const mergedAttrDef = mergeAttrs( attrDefs[attr.ident], attr )
                const mergeIdent = `${attr.ident}-${elementName}`
                replaceEntry( attr.ident, mergeIdent, validAttrs )
                if( mergedAttrDef.usage === 'req' ) {
                    if( attrDefs[attr.ident].usage === 'req' ) {
                        replaceEntry( attr.ident, mergeIdent, requiredAttrs )                    
                    } else {
                        requiredAttrs.push(mergeIdent)                  
                    }
                } 
                attrDefs[mergeIdent] = mergedAttrDef
            } else if( attr.mode === 'delete') {
                replaceEntry( attr.ident, null, validAttrs )
                replaceEntry( attr.ident, null, requiredAttrs )
            } else {
                validAttrs.push( attr.ident )
                if( attr.usage === 'req' ) requiredAttrs.push( attr.ident )    
            }
        }
        element.validAttrs = validAttrs.sort()
        element.requiredAttrs = requiredAttrs.sort()
    }

    // These attributes are treated specially
    attrDefs['xml:id'].hidden = true
    attrDefs['xml:base'].hidden = true

    return attrDefs
}

// EXPORTS /////////////
module.exports.createAttributes = createAttributes
