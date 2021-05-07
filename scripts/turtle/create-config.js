const createConfig = function createConfig(teiSchema) {
    const { attrs } = teiSchema

    const elements = {}
    const vocabs = {}
    
    // intialize the elements
    for( const element of teiSchema.elements ) {
        const { validAttrs } = element
        const configElement = {
            attrState: {}
        }
        if( validAttrs ) {
            for( const attr of validAttrs ) {
                configElement.attrState[attr] = { active: false }        
                const { valListType, dataType } = teiSchema.attrs[attr]
                if( dataType === 'teidata.enumerated' ) {
                    configElement.attrState[attr].vocabID = (valListType !== 'open') ?
                        getDefaultVocabKey('*',attr) :
                        getDefaultVocabKey(element.name,attr)
                }
            }
        }
        elements[element.name] = configElement
    }

    // set some default attrs 
    elements.hi.attrState.rend.active = true
    elements.ref.attrState.target.active = true
    elements.markhi.attrState.rend.active = true
    elements.markref.attrState.target.active = true

    // initialize vocabs
    for( const attr of Object.values(attrs) ) {
        const { valList, valListType } = attr
        if( valList && valListType !== 'open' ) {
            const vocabKey = getDefaultVocabKey('*',attr.ident)
            const vocab = []
            for( const val of valList ) {
                // marked as read only
                vocab.push([val.ident, false])
            }
            vocabs[vocabKey] = vocab 
        }
    }

    return { elements, vocabs }
}

function getDefaultVocabKey(elementName,attributeName) {
    return `${elementName}[${attributeName}]`
}

// EXPORTS /////////////
module.exports.createConfig = createConfig;