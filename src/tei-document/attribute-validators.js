
// token represents tokenized strings. The ·value space· of token is the set of
// strings that do not contain the carriage return (#xD), line feed (#xA) nor tab
// (#x9) characters, that have no leading or trailing spaces (#x20) and that
// have no internal sequences of two or more spaces.
export function tokenValidator( value ) {

    // TODO validate
    
    if( value && value.length > 0 ) {
        return { error: true, errorMessage: "test error"}

    } else {
        return { error: false, errorMessage: ""}
    }
}