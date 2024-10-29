import { tokenValidator, teiDataWordValidator, uriValidator, checkID } from './attribute-validators'
import { changeAttributes } from "./commands"
import { systemAttributes, rtlLanguages } from './TEISchema'

// Ammends the document with run time only flags
export function applySystemFlags(teiSchema, idMap, fairCopyConfig, parentLocalID, tr) {
    const errors = []
    tr.doc.descendants((node,pos) => {
        const nodeErrors = markErrors(node,pos,tr,parentLocalID,idMap,teiSchema,fairCopyConfig)
        errors.push(...nodeErrors)
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
    let errors = []

    const attrsMessage = scanAttrs(node.attrs,elementID,teiSchema,attrState,parentLocalID,idMap)
    const elementMessage = scanElement(elementID,fairCopyConfig)

    if( attrsMessage || elementMessage ) {
        const nextAttrs = { ...node.attrs, '__error__': true }
        changeAttributes( node, nextAttrs, $anchor, tr )
        const errorMessage = elementMessage ? elementMessage : `${elementID}: ${attrsMessage}`
        errors.push({errorMessage, elementName: elementID, pos, nodeSelection: true})
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
        const markAttrsMessage = scanAttrs(mark.attrs,markElementID,teiSchema,markAttrState,parentLocalID,idMap)
        const markElementMessage = scanElement(markElementID,fairCopyConfig)

        if( markAttrsMessage || markElementMessage ) {
            const nextAttrs = { ...mark.attrs, '__error__': true }
            changeAttributes( mark, nextAttrs, $anchor, tr )
            const markErrorMessage = markElementMessage ? markElementMessage : `${markElementID}: ${markAttrsMessage}`
            errors.push({errorMessage: markErrorMessage, elementName: markElementID, pos, nodeSelection: false})
        } else {
            if( mark.attrs['__error__'] ) {
                const nextAttrs = { ...mark.attrs, '__error__': false }
                changeAttributes( mark, nextAttrs, $anchor, tr )
            }
        }
    }
 
    return errors
}

function scanElement( elementID, fairCopyConfig ) {
    if( fairCopyConfig.elements[elementID] && fairCopyConfig.elements[elementID].active === false ) {
        return `${elementID} is not in the project schema.`
    } else {
        return false
    }
}

function scanAttrs(attrs, elementID, teiSchema, attrState, parentLocalID, idMap) {
    for( const key of Object.keys(attrs) ) {        
        const attrSpec = teiSchema.getAttrSpec(key,elementID)
        const value = attrs[key]

        // flag attrs that don't have an attrSpec and aren't system attrs
        if( !attrSpec ) {
            if( systemAttributes.includes(key) ) continue
            else return `${key} attribute in project schema`
        }

        // flag deactivate attrs that have values
        if( attrState && attrState[key] && attrSpec.hidden !== true && attrState[key].active === false && value && value !== "" ) {
            return `${key} attribute has a value but is not in the project schema`
        }
        // flag required attrs that aren't active
        if( attrSpec && attrSpec.usage === 'req' && attrState[key].active === false ) {
            return `${key} is a required attribute`
        }

        // flag activate attrs that don't validate
        if( value && attrSpec ) {
            const validState = validateAttribute(value,parentLocalID,idMap,attrSpec)
            if( validState.error ) return `${key}: ${validState.errorMessage}`
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