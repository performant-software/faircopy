const fairCopy = window.fairCopy

export default class FairCopyConfig {

    constructor(json) {
        this.state = JSON.parse(json)
    }

    destroy() {
        // unsubscribe onUpdate callback
        fairCopy.services.configUnsubscribe(this.configPath,this.onUpdate)
    }

    createFromDoc(teiDocument) {
        // populate it based on the tei document
        const initialState = this.stateFromDoc(teiDocument)
        fairCopy.services.configSubscribe(this.configPath,this.onUpdate,initialState)
    }

    createNew() {
        // populate it based on the tei document
        fairCopy.services.configSubscribe(this.configPath,this.onUpdate,this.initialState())
    }

    setAttrState(elementName,attrName,nextAttrState) {        
        const nextState = { ...this.state }
        nextState.elements[elementName].attrState[attrName] = nextAttrState
        this.setState(nextState)        
    }

    setVocabState(vocabID,nextVocabState) {
        const nextState = { ...this.state }
        nextState.vocabs[vocabID] = nextVocabState
        this.setState(nextState)        
    }

    getDefaultVocabKey(elementName,attributeName) {
        return `${elementName}[${attributeName}]`
    }

    getVocab(elementName,attrName) {
        const vocabID = this.state.elements[elementName].attrState[attrName].vocabID
        const vocab = ( vocabID && this.state.vocabs[vocabID]) ? this.state.vocabs[vocabID] : []
        return { vocabID, vocab } 
    }

    initialState(teiSchema) {
        const { attrs } = teiSchema

        const elements = {}
        const vocabs = {}
        
        // intialize the elements
        for( const element of Object.values(teiSchema.elements) ) {
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
                            this.getDefaultVocabKey('*',attr) :
                            this.getDefaultVocabKey(element.name,attr)
                    }
                }
            }
            elements[element.name] = configElement
        }

        // initialize vocabs
        for( const attr of Object.values(attrs) ) {
            const { valList, valListType } = attr
            if( valList && valListType !== 'open' ) {
                const vocabKey = this.getDefaultVocabKey('*',attr.ident)
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

    stateFromDoc(teiDocument) {
        const { teiSchema } = teiDocument
        const { subDocIDs } = teiSchema
        const doc = teiDocument.initialState.doc
        const { elements, vocabs } = this.initialState(teiSchema)

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
                                vocabID = this.getDefaultVocabKey('*',attrName)
                                if( attrSpec.valListType === 'semi' ) {
                                    addTerm(vocabID,val)
                                }
                            } else {
                                vocabID = this.getDefaultVocabKey(name,attrName)
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

    onUpdate = (nextState) => {
        // receive next state from main process, update state
        this.state = nextState

        // create a trivial editor state update to push new state
        // TODO this.teiDocument.refreshView()
    }

    setState(nextState) {
        // TODO
        // send next state to main process
        // fairCopy.services.updateConfig(this.configPath, nextState)
        this.onUpdate(nextState)
    }

    save() {
        console.log('saving')
        if( this.state ) {
            fairCopy.services.writeFileSync(this.configPath, JSON.stringify(this.state, null, '\t'))
        }
    }

}