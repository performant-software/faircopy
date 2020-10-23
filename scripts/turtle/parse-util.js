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
    for( let i=0; i < el.children.length; i++ ) {
        const child = el.children[i]
        if( child.nodeName.toLowerCase() === tagName && child.getAttribute("xml:lang") === lang ) {
            // remove markup, newlines, runs of whitespace
            const str = child.textContent.replace(/\n/gm,' ').replace(/\s{2,}/gm,' ')
            return str
        }
    }
}

const getAllElements = function getAllElements(elementGroups) {
    const allElements = []
    for( const elementGroupName of Object.keys(elementGroups) ) {
        if( elementGroupName !== 'exclude' ) {
            for( const ident of elementGroups[elementGroupName] ) {
                allElements.push(ident)
            }    
        }
    }
    return allElements
}


// EXPORTS /////////////
module.exports.getKeys = getKeys;
module.exports.loadLocalizedString = loadLocalizedString;
module.exports.getAllElements = getAllElements;