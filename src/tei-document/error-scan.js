import { tokenValidator, teiDataWordValidator, uriValidator, idValidator } from './attribute-validators'
import { changeAttributes } from "./commands"

// Ammends the document with run time only elements such as text node and error flags
export function scanForErrors(teiSchema, idMap, parentLocalID, tr) {
    tr.doc.descendants((node,pos) => {
        markAttrErrors(node,pos,tr,parentLocalID,idMap,teiSchema)
        return true
    })
}

// validate all attrs and mark any errors.
function markAttrErrors(node, pos, tr, parentLocalID, idMap, teiSchema) {
    const attrSpecs = teiSchema.attrs
    const $anchor = tr.doc.resolve(pos)

    if( scanAttrs(node.attrs,attrSpecs,parentLocalID,idMap) ) {
        const nextAttrs = { ...node.attrs, '__error__': true }
        changeAttributes( node, nextAttrs, $anchor, tr )
    } else {
        for( const mark of node.marks ) {
            if( scanAttrs(mark.attrs,attrSpecs,parentLocalID,idMap) ) {
                const nextAttrs = { ...mark.attrs, '__error__': true }
                changeAttributes( mark, nextAttrs, $anchor, tr )
                return
            }
        }
    }
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
        const validState = idValidator( value ) 
        if( !validState.error ) {
            const entry = idMap.get(`#${value}`,parentLocalID) 
            if( entry && entry.useCount > 1 ) {
                return { error: true, errorMessage: 'ID must be unique to the document.'}
            }
        }
        return validState
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