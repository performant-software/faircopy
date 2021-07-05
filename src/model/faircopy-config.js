const fairCopy = window.fairCopy

const importGroupName = "Untitled Group"

// add the element to the menu and update the config
export function addElementToMenu(elementID,palettePos,groupID,menuID,fairCopyConfig) {
    const { elements, menus } = fairCopyConfig
    const groupMembers = menus[menuID][groupID].members
    if( groupMembers.includes(elementID) ) {
        return { error: true, message: `${elementID} is already on this menu.`}        
    }
    if( !elements[elementID] ) {
        return { error: true, message: `${elementID} is not in the config schema.`}   
    }
    elements[elementID].active = true
    const start = groupMembers.slice(0,palettePos)
    const end = groupMembers.slice(palettePos)
    menus[menuID][groupID].members = [...start,elementID,...end]
    return { error: false }
}

export function removeElementFromMenu( elementID, groupID, menuID, fairCopyConfig) {
    const { elements, menus } = fairCopyConfig
    const groupMembers = menus[menuID][groupID].members
    const index = groupMembers.indexOf(elementID)
    if( index !== -1 ) {
        const start = groupMembers.slice(0,index)
        const end = groupMembers.slice(index+1)
        menus[menuID][groupID].members = [...start,...end]    
    }
    if( !findElementInMenus(elementID, fairCopyConfig) ) {
        // not referenced in menus, becomes inactive
        elements[elementID].active = false  
    }
    return index
}

export function addElementToSchema( elementID, teiSchema, fairCopyConfig ) {
    const { elements } = fairCopyConfig 
    const elementMenu = teiSchema.getElementMenu(elementID)
    const groups = fairCopyConfig.menus[elementMenu]
    const group = groups.find((g) => g.label === importGroupName )
    if( group ) {
        group.members.push(elementID)
    } else {
        groups.push({ label: importGroupName, members: [ elementID ]})
    }   
    elements[elementID].active = true
}

export function findElementInMenus( elementID, fairCopyConfig ) {
    const { menus } = fairCopyConfig

    for( const groups of Object.values(menus) ) {
        for( const group of groups ) {
            for( const member of group.members ) {
                if( member === elementID ) return true
            } 
        }
    }
    return false
}

export function addGroupToMenu( label, menuID, fairCopyConfig ) {
    const group = {
        label,
        members: []
    }
    fairCopyConfig.menus[menuID].push(group)
}

export function removeGroupFromMenu( groupIndex, menuID, fairCopyConfig) {
    const { elements, menus } = fairCopyConfig
    const groups = menus[menuID]
    const group = groups[groupIndex]
    const start = groups.slice(0,groupIndex)
    const end = groups.slice(groupIndex+1)
    menus[menuID] = [...start,...end]    

    // deactivate member elements as necessary
    for( const member of group.members ) {
        if( !findElementInMenus(member, fairCopyConfig) ) {
            elements[member].active = false  
        }
    }
}

export function learnDoc(fairCopyConfig, doc, teiSchema, tempDoc) {
    const { subDocs } = tempDoc
    const { elements, vocabs } = fairCopyConfig

    const addTerm = ( vocabID, term ) => {
        const vocabEntry = vocabs[vocabID]
        const valEntry = [term,true]
        if( vocabEntry ) {
            // unique values only
            if( !vocabEntry.find( v => v[0] === term ) ) {
                vocabEntry.push(valEntry)
            }
        } else {
            vocabs[vocabID] = [valEntry]
        }
    }

    const compareToActive = ( element ) => {
        const {attrs, type} = element
        const {name} = type
        for( const attrName of Object.keys(attrs)) {
            const val = attrs[attrName]
            if( val && val !== "" ) {
                if( elements[name].attrState[attrName] ) {
                    elements[name].attrState[attrName].active = true
                    const attrSpec = teiSchema.attrs[attrName]
                    // populate the vocabulary with any existing values
                    if( attrSpec.dataType === "teidata.enumerated" ) {
                        let vocabID
                        if( attrSpec.valListType !== 'open' ) {
                            // attrs of the same type that are not open share a common vocab
                            vocabID = getDefaultVocabKey('*',attrName)
                            if( attrSpec.valListType === 'semi' ) {
                                addTerm(vocabID,val)
                            }
                        } else {
                            vocabID = getDefaultVocabKey(name,attrName)
                            addTerm(vocabID,val)
                        }
                        elements[name].attrState[attrName].vocabID = vocabID    
                    }
                }
            }
        }   
    }

    function scanNode(node) {
        // first, look at the attrs for the node
        compareToActive(node)

        // then look at the attrs for each mark
        for( const mark of node.marks ) {
            compareToActive(mark)
        }

        // inspect children of this node
        for( let i=0; i < node.childCount; i++ ) {
            const child = node.child(i)
            scanNode(child)
        }            
    }

    // scan the main doc
    scanNode(doc)

    // scan any subdocs
    for( const subDocJSON of Object.values(subDocs) ) {
        const noteJSON = JSON.parse( subDocJSON )
        const subDoc = teiSchema.schema.nodeFromJSON(noteJSON);
        scanNode(subDoc)
    }

    return { elements, vocabs }
}

function getDefaultVocabKey(elementName,attributeName) {
    return `${elementName}[${attributeName}]`
}

export function saveConfig( fairCopyConfig ) {
    fairCopy.services.ipcSend('requestSaveConfig', JSON.stringify(fairCopyConfig))
}

export function exportConfig( exportPath, fairCopyConfig ) {
    fairCopy.services.ipcSend('requestExportConfig', exportPath, JSON.stringify(fairCopyConfig))
}