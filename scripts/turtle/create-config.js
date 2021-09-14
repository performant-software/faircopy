const fs = require('fs');

function getAttrSpec( attrID, elementID, teiSchema ) {
    const elementSpec = teiSchema.elements.find( element => element.name === elementID )
    if( elementSpec.fcType === 'textNodes' || elementSpec.fcType === 'globalNodes' ) return teiSchema.attrs[attrID]
    return elementSpec.derivedAttrs.includes(attrID) ? teiSchema.attrs[`${attrID}-${elementID}`] : teiSchema.attrs[attrID]
}

const createConfig = function createConfig(teiSchema) {
    const { attrs } = teiSchema

    const elements = {}
    const vocabs = {}
    
    // intialize the elements
    for( const element of teiSchema.elements ) {
        // skip over synthetic elements
        if( element.synth ) continue

        const { validAttrs } = element
        const configElement = {
            active: false,
            attrState: {}
        }
        if( validAttrs ) {
            for( const attr of validAttrs ) {
                configElement.attrState[attr] = { active: false }        
                const { valList, valListType, dataType, mode } = getAttrSpec(attr,element.name,teiSchema)
                if( dataType === 'teidata.enumerated' ) {
                    if( valListType !== 'open' ) {
                        if( mode !== 'change' ) {
                            // use globally defined vocab
                            configElement.attrState[attr].vocabID = getDefaultVocabKey('*',attr)
                        } else {
                            // use element specific vocab
                            const vocabKey = getDefaultVocabKey(element.name,attr)
                            configElement.attrState[attr].vocabID = vocabKey
                            const vocab = []
                            for( const val of valList ) {
                                vocab.push([val.ident, false])
                            }
                            vocabs[vocabKey] = vocab 
                        }
                    } else {
                        // vocab not predefinied, user creates element specific 
                        configElement.attrState[attr].vocabID = getDefaultVocabKey(element.name,attr)
                    }
                }
            }
        }
        elements[element.name] = configElement
    }

    // set some default attrs 
    elements.hi.attrState.rend.active = true
    elements.ref.attrState.target.active = true

    // initialize global vocabs
    for( const attr of Object.values(attrs) ) {
        const { valList, valListType } = attrs
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

    // initialize menus, parse from config file to internal format
    const menuGroupsJSON = fs.readFileSync(`scripts/turtle/menu-groups-en.json`).toString('utf-8')
    const menus = parseMenus(menuGroupsJSON,elements)

    return { menus, elements, vocabs }
}

function parseMenus(json,elements) {
    const menuData = JSON.parse(json)

    const menus = {}
    for( const menuID of Object.keys(menuData) ) {
        menus[menuID] = parseMenu(menuData[menuID],elements)
    }

    return menus
}

function parseMenu(menuEntries, elements) {
    const menuGroups = []
    for( const menuEntry of menuEntries ) {
        const members = []
        for( const member of menuEntry.members ) {
            // cross check to make sure members are valid elements
            if( elements[member] === undefined ) throw new Error(`Element "${member}" in menus not found in schema.`)
            elements[member].active = true 
            members.push(member)
        }
        menuEntry.members = members
        menuGroups.push( menuEntry )
    }

    return menuGroups
}

function getDefaultVocabKey(elementName,attributeName) {
    return `${elementName}[${attributeName}]`
}

// EXPORTS /////////////
module.exports.createConfig = createConfig;