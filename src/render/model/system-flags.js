import { tokenValidator, teiDataWordValidator, uriValidator, checkID } from './attribute-validators'
import { changeAttributes } from "./commands"
import { systemAttributes, rtlLanguages } from './TEISchema'

// Ammends the document with run time only flags
export function applySystemFlags(teiSchema, idMap, fairCopyConfig, parentLocalID, tr) {
    const errors = []
    tr.doc.descendants((node,pos) => {
        const errorObj = markErrors(node,pos,tr,parentLocalID,idMap,teiSchema,fairCopyConfig)
        if( errorObj ) errors.push(errorObj)
        markRTL(node,pos,tr)
        return true
    })    
    return errors
}

function markRTL(node,pos,tr) {
    const lang = node.attrs['xml:lang']
    const rtl = node.attrs['__rtl__']
    const ltr = node.attrs['__ltr__']
    if( !lang ) {
        if( rtl || ltr ) {
            const nextAttrs = { ...node.attrs, '__rtl__': false, '__ltr__': false }
            const $anchor = tr.doc.resolve(pos)
            changeAttributes( node, nextAttrs, $anchor, tr )    
        }
    } else {
        if( rtlLanguages.includes(lang) ) {
            if( !rtl ) {
                const $anchor = tr.doc.resolve(pos)
                const nextAttrs = { ...node.attrs, '__rtl__': true, '__ltr__': false }
                changeAttributes( node, nextAttrs, $anchor, tr )    
            }
        } else {
            if( !ltr ) {
                const $anchor = tr.doc.resolve(pos)
                const nextAttrs = { ...node.attrs, '__rtl__': false, '__ltr__': true }
                changeAttributes( node, nextAttrs, $anchor, tr )    
            }
        }    
    }
}

// validate node and mark any errors.
function markErrors(node, pos, tr, parentLocalID, idMap, teiSchema,fairCopyConfig) {
    const elementID = node.type.name
    const attrState = fairCopyConfig.elements[elementID] ? fairCopyConfig.elements[elementID].attrState : null
    const $anchor = tr.doc.resolve(pos)
    let errorFound = false

    if( scanAttrs(node.attrs,elementID,teiSchema,attrState,parentLocalID,idMap) || scanElement(elementID,fairCopyConfig) ) {
        const nextAttrs = { ...node.attrs, '__error__': true }
        changeAttributes( node, nextAttrs, $anchor, tr )
        errorFound = true
    } else {
        if( node.attrs['__error__'] ) {
            const nextAttrs = { ...node.attrs, '__error__': false }
            changeAttributes( node, nextAttrs, $anchor, tr )
        }
    }

    for( const mark of node.marks ) {
        const name = mark.type.name 
        const markElementID = name.startsWith('mark') ? name.slice(4) : name
        const markAttrState = fairCopyConfig.elements[markElementID] ? fairCopyConfig.elements[markElementID].attrState : null
        if( scanAttrs(mark.attrs,name,teiSchema,markAttrState,parentLocalID,idMap) || scanElement(markElementID,fairCopyConfig)) {
            const nextAttrs = { ...mark.attrs, '__error__': true }
            changeAttributes( mark, nextAttrs, $anchor, tr )
            errorFound = true
        } else {
            if( mark.attrs['__error__'] ) {
                const nextAttrs = { ...mark.attrs, '__error__': false }
                changeAttributes( mark, nextAttrs, $anchor, tr )
            }
        }
    }
 
    return errorFound ? { elementName: elementID, pos } : null
}

function scanElement( elementID, fairCopyConfig ) {
    return fairCopyConfig.elements[elementID] && fairCopyConfig.elements[elementID].active === false
}

function scanAttrs(attrs, elementID, teiSchema, attrState, parentLocalID, idMap) {
    for( const key of Object.keys(attrs) ) {        
        const attrSpec = teiSchema.getAttrSpec(key,elementID)
        const value = attrs[key]

        // flag attrs that don't have an attrSpec and aren't system attrs
        if( !attrSpec ) {
            if( systemAttributes.includes(key) ) continue
            else return true
        }

        // flag deactivate attrs that have values
        if( attrState && attrState[key] && attrSpec.hidden !== true && attrState[key].active === false && value && value !== "" ) {
            return true
        }
        // flag required attrs that aren't active
        if( attrSpec && attrSpec.usage === 'req' && attrState[key].active === false ) {
            return true
        }

        // flag activate attrs that don't validate
        if( value && attrSpec ) {
            const validState = validateAttribute(value,parentLocalID,idMap,attrSpec)
            if( validState.error ) return true
        }
    }
    return false
}

function validateAttribute(value,parentLocalID,idMap,attrSpec) {
    const { dataType, minOccurs, maxOccurs } = attrSpec

    if( dataType === 'ID' ) {
        return checkID(value, parentLocalID, idMap)
    }

    if( dataType === 'token') {
        return tokenValidator(value)
    }
    if( dataType === 'teidata.word' || dataType === 'teidata.enumerated' ) {
        return teiDataWordValidator(value, minOccurs, maxOccurs)
    }
    if( dataType === 'teidata.pointer' ) {
        // TODO need to pass in ID Map here
        return validateTEIPointerArray(value)
    }

    // otherwise, consider it valid
    return { error: false }
}

function validateTEIPointerArray(attrValue) {
    let error = false
    let errorMessage = ''
    const errorValues = []
    const values = attrValue.split(' ')
    for( const value of values ) {
        const validResult = uriValidator(value)
        if( validResult.error ) {
            if( !error ) {
                // record the specifics of the first error
                error = true
                errorMessage = validResult.errorMessage    
            }
            // record all bad values
            errorValues.push(value)
        }
    }
    return { error, errorMessage, errorValues }
}