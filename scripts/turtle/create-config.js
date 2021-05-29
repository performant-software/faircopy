const fs = require('fs');

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