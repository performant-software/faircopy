
export function singleTokenValidator( value ) {
    if( value.search(/\s/) !== -1  ) {
        return { error: true, errorMessage: "can not contain whitespace"}
    }
    return { error: false, errorMessage: ""}
}

// IDs are used as relative URIs, so they must be valid as such
export function idValidator( value ) {
    if( value.match(/^[0-9]/) ) {
        return { error: true, errorMessage: "can not have a numeral as the first character."}    
    }
    if( value.search(/[\s#&?:/]/) !== -1  ) {
        return { error: true, errorMessage: "can not contain whitespace or any of: '#,&,?,:,/'."}
    }
    return { error: false, errorMessage: ""}    
}

// check the uniqueness of an existing ID and validate its syntax
export function checkID(value, parentLocalID, idMap) {
    const validState = idValidator( value ) 
    if( !validState.error ) {
        const entry = idMap.get(`#${value}`,parentLocalID) 
        if( entry && entry.useCount > 1 ) {
            return { error: true, errorMessage: 'ID must be unique to the document.'}
        }
    }
    return validState
}

// Test that this is a valid URI
export function uriValidator( value ) {
    try {
        if( value.startsWith('#') ) {
            return idValidator( value.slice(1) )
        } else {
            new URL(value, 'https://faircopy.com/')
        }
        return { error: false, errorMessage: ""}
    } catch(e) {
        return { error: true, errorMessage: `Invalid URI` }
    }
}

// token represents tokenized strings. The ·value space· of token is the set of
// strings that do not contain the carriage return (#xD), line feed (#xA) nor tab
// (#x9) characters, that have no leading or trailing spaces (#x20) and that
// have no internal sequences of two or more spaces.
export function tokenValidator( value ) {
    if( value.search(/^\s/) !== -1  ) {
        return { error: true, errorMessage: "can not start with whitespace"}
    }
    if( value.search(/\s$/) !== -1  ) {
        return { error: true, errorMessage: "can not end with whitespace"}
    }
    if( value.search(/\s{2,}/) !== -1 ) {
        return { error: true, errorMessage: "runs of whitespace are not allowed"}
    }
    return { error: false, errorMessage: ""}
}

// Attributes using this datatype must contain a single
// word which contains only letters, digits,
// punctuation characters, or symbols: thus it cannot include
// whitespace.
export function teiDataWordValidator( value, minOccurs, maxOccurs ) {
    const quantityError = validateQuantity( value, minOccurs, maxOccurs, 'words' )
    if( quantityError.error ) return quantityError
    return { error: false, errorMessage: "" }
}

export function teiDataNumericValidator( value, minOccurs, maxOccurs ) {
    const quantityError = validateQuantity( value, minOccurs, maxOccurs, 'numerics' )
    if( quantityError.error ) return quantityError

    const fractionRegEx = /(-?[\d]+\/-?[\d]+)/

    const tokens = value.split(' ')
    for( const token of tokens ) {
        if( isNaN(token) && !token.match(fractionRegEx) ) {
            return { error: true, errorMessage: "Must be an integer, decimal, or fraction."}
        }
    }

    return { error: false, errorMessage: "" }
}

export function teiDataCountValidator( value, minOccurs, maxOccurs ) {
    const quantityError = validateQuantity( value, minOccurs, maxOccurs, 'integers' )
    if( quantityError.error ) return quantityError

    const tokens = value.split(' ')
    for( const token of tokens ) {
        // must be a non negative integer (scientific notation not allowed)
        if( isNaN(token) || token.includes('.') || token.toLowerCase().includes('e') || parseInt(token) < 0 ) {
            return { error: true, errorMessage: "Must be a non-negative integer."}
        }
    }

    return { error: false, errorMessage: "" }
}

export function teiDataProbability( value, minOccurs, maxOccurs ) {
    const quantityError = validateQuantity( value, minOccurs, maxOccurs, 'values' )
    if( quantityError.error ) return quantityError

    const tokens = value.split(' ')
    for( const token of tokens ) {
        const probVal = parseFloat(token)
        if( isNaN(probVal) || probVal < 0.0 || probVal > 1.0 ) {
            return { error: true, errorMessage: "Must be a value between 0 and 1."}
        }
    }

    return { error: false, errorMessage: "" }
}

export function teiDataTruthValue( value, minOccurs, maxOccurs ) {
    const quantityError = validateQuantity( value, minOccurs, maxOccurs, 'values' )
    if( quantityError.error ) return quantityError

    // 	The possible values of this datatype are 1 or true, or 0 or false.
    const validValues = ['0','1','true','false','TRUE','FALSE']
    
    const tokens = value.split(' ')
    for( const token of tokens ) {
        if( !validValues.includes(token)) {
            return { error: true, errorMessage: "Must be true or false, 0 or 1."}
        }
    }

    return { error: false, errorMessage: "" }
}

export function validateURL(value) {
    try {
        new URL(value)
        return { error: false, errorMessage: ""}
    } catch(e) {
        return { error: true, errorMessage: `Invalid URL` }
    }
}

export function sanitizeID(value) {
    // can not contain whitespace or any of: '#,&,?,:,/'
    let cleanID = value.replace(/[\s#&?:/]/g,'');
    if( cleanID.match(/^[0-9]/) ) {
        // can't have number as first char
        cleanID = `_${cleanID}`
    }
    return cleanID.length > 0 ? cleanID : null
}

function validateQuantity( value, minOccurs, maxOccurs, dataType ) {
    let tokenStatus = tokenValidator(value)
    if( tokenStatus.error ) return tokenStatus

    let min = (minOccurs !== null ) ? Number(minOccurs) : 1
    let max = (maxOccurs === "unbounded" ) ? "unbounded" : (maxOccurs !== null ) ? Number(maxOccurs) : 1
    
    const match = value.match(/[\S]+/g)
    const wordCount = (match) ? match.length : 0

    if( max !== "unbounded" && wordCount > max ) {
        return { error: true, errorMessage: `exceeded allowable number of ${dataType}`}
    }

    if( wordCount < min ) {
        return { error: true, errorMessage: `does not contain minimum number of ${dataType}`}
    }

    return { error: false, errorMessage: "" }
}