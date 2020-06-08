

// TODO use this code as part of the XML import process

export function createFromDoc(teiDocument) {
    const { teiSchema } = teiDocument
    const { subDocIDs } = teiSchema
    const doc = teiDocument.initialState.doc
    const { elements, vocabs } = this.createNew(teiSchema)

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
    for( const subDocID of subDocIDs ) {
        const noteJSON = JSON.parse( localStorage.getItem(subDocID) )
        const subDoc = teiSchema.schema.nodeFromJSON(noteJSON);
        scanNode(subDoc)
    }

    return { elements, vocabs }
}

function getDefaultVocabKey(elementName,attributeName) {
    return `${elementName}[${attributeName}]`
}

//Old interface////////////////////////////////////////////////////////////////

function setAttrState(elementName,attrName,nextAttrState) {        
    const nextState = { ...this.state }
    nextState.elements[elementName].attrState[attrName] = nextAttrState
    this.setState(nextState)        
}

function setVocabState(vocabID,nextVocabState) {
    const nextState = { ...this.state }
    nextState.vocabs[vocabID] = nextVocabState
    this.setState(nextState)        
}
