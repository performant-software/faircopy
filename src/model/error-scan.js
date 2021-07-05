import { tokenValidator, teiDataWordValidator, uriValidator, checkID } from './attribute-validators'
import { changeAttributes } from "./commands"

// Ammends the document with run time only elements such as text node and error flags
export function scanForErrors(teiSchema, idMap, fairCopyConfig, parentLocalID, tr) {
    let errorCount = 0
    tr.doc.descendants((node,pos) => {
        errorCount += markAttrErrors(node,pos,tr,parentLocalID,idMap,teiSchema,fairCopyConfig)
        return true
    })
    return errorCount
}

// validate all attrs and mark any errors.
function markAttrErrors(node, pos, tr, parentLocalID, idMap, teiSchema,fairCopyConfig) {
    const attrSpecs = teiSchema.attrs
    const $anchor = tr.doc.resolve(pos)
    let errorCount = 0

    if( scanAttrs(node.attrs,attrSpecs,parentLocalID,idMap) || scanElement(node,fairCopyConfig) ) {
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
        if( scanAttrs(mark.attrs,attrSpecs,parentLocalID,idMap) || scanElement(mark,fairCopyConfig)) {
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

function scanElement( node, fairCopyConfig ) {
    let elementID = node.type.name
    elementID = elementID.startsWith('mark') ? elementID.slice(4) : elementID
    return fairCopyConfig.elements[elementID] && fairCopyConfig.elements[elementID].active === false
}

function scanAttrs(attrs, attrSpecs, parentLocalID, idMap) {
    for( const key of Object.keys(attrs) ) {        
        const attrSpec = attrSpecs[key]
        const value = attrs[key]
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