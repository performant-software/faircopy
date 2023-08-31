
export function ellipsis( originalString, length ) {
    if( originalString.length <= length ) return originalString
    let shortString = originalString.substr(0,length)
    return `${shortString}...`
}
