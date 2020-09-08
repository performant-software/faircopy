const getKeys = function getKeys(el,keyTag) {
    const keys = []
    const tags = el ? el.getElementsByTagName(keyTag) : []

    for (let i = 0; i < tags.length; i++) {
        const tagEl = tags[i]
        if( keyTag === tagEl.localName )  {
            keys.push( tagEl.getAttribute('key') )    
        }
    } 
    return keys   
}

const loadLocalizedString = function loadLocalizedString(el, tagName, lang="en") {
    // Load the description of this element
    let str = ""
    const tagEls = el.getElementsByTagName(tagName)
    for( let i=0; i < tagEls.length; i++ ) {
        const tagEl = tagEls[i]
        if( tagEl.getAttribute("xml:lang") === lang ) {
            // TODO flatten out newlines and runs of whitespace
            str = tagEl.innerHTML
        }
    }
    return str
}


// EXPORTS /////////////
module.exports.getKeys = getKeys;
module.exports.loadLocalizedString = loadLocalizedString;