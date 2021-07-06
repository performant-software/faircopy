import { tokenValidator, teiDataWordValidator, uriValidator, checkID } from './attribute-validators'
import { changeAttributes } from "./commands"

// Ammends the document with run time only error flags
export function scanForErrors(teiSchema, idMap, fairCopyConfig, parentLocalID, tr) {
    let errorCount = 0
    tr.doc.descendants((node,pos) => {
        errorCount += markErrors(node,pos,tr,parentLocalID,idMap,teiSchema,fairCopyConfig)
        return true
    })
    return errorCount
}

// validate node and mark any errors.
function markErrors(node, pos, tr, parentLocalID, idMap, teiSchema,fairCopyConfig) {
    const attrSpecs = teiSchema.attrs
    const elementID = node.type.name
    const attrState = fairCopyConfig.elements[elementID] ? fairCopyConfig.elements[elementID].attrState : null
    const $anchor = tr.doc.resolve(pos)
    let errorCount = 0

    if( scanAttrs(node.attrs,attrSpecs,attrState,parentLocalID,idMap) || scanElement(elementID,fairCopyConfig) ) {
        const nextAttrs = { ...node.attrs, '__error__': true }
        changeAttributes( node, nextAttrs, $anchor, tr )
        errorCount++
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
        if( scanAttrs(mark.attrs,attrSpecs,markAttrState,parentLocalID,idMap) || scanElement(markElementID,fairCopyConfig)) {
            const nextAttrs = { ...mark.attrs, '__error__': true }
            changeAttributes( mark, nextAttrs, $anchor, tr )
            errorCount++
            return errorCount
        } else {
            if( mark.attrs['__error__'] ) {
                const nextAttrs = { ...mark.attrs, '__error__': false }
                changeAttributes( mark, nextAttrs, $anchor, tr )
            }
        }
    }

    return errorCount
}

function scanElement( elementID, fairCopyConfig ) {
    return fairCopyConfig.elements[elementID] && fairCopyConfig.elements[elementID].active === false
}

function scanAttrs(attrs, attrSpecs, attrState, parentLocalID, idMap) {
    for( const key of Object.keys(attrs) ) {        
        const attrSpec = attrSpecs[key]
        const value = attrs[key]
        // flag deactivate attrs that have values
        if( attrState && attrState[key] && attrSpec.hidden !== true && attrState[key].active === false && value && value !== "" ) {
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