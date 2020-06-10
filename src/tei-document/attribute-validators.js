
export function singleTokenValidator( value ) {
    if( value.search(/\s/) !== -1  ) {
        return { error: true, errorMessage: "can not contain whitespace"}
    }
    return { error: false, errorMessage: ""}
}

// IDs are used as relative URIs, so they must be valid as such
export function idValidator( value ) {
    if( value.search(/[\s#&?:/]/) !== -1  ) {
        return { error: true, errorMessage: "can not contain whitespace or any of: '#,&,?,:,/'."}
    }
    return { error: false, errorMessage: ""}
}

// Test that this is a valid URI
export function uriValidator( value ) {
    try {
        if( value.startsWith('#') ) {
            return idValidator( value.slice(1) )
        } else {
            new URL(value)
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
    let tokenStatus = tokenValidator(value)
    if( tokenStatus.error ) return tokenStatus

    let min = (minOccurs !== null ) ? Number(minOccurs) : 1
    let max = (maxOccurs === "unbounded" ) ? "unbounded" : (maxOccurs !== null ) ? Number(maxOccurs) : 1
    
    const match = value.match(/[\S]+/g)
    const wordCount = (match) ? match.length : 0

    if( max !== "unbounded" && wordCount > max ) {
        return { error: true, errorMessage: "exceeded allowable number of words"}
    }

    if( wordCount < min ) {
        return { error: true, errorMessage: "does not contain minimum number of words"}
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
    return cleanID.length > 0 ? cleanID : null
}