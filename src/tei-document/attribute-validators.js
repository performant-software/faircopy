
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