const fairCopy = window.fairCopy

export default class FairCopyConfig {

    constructor(teiDocument, configPath) {
        this.configPath = configPath
        this.teiDocument = teiDocument
        this.state = null
        // subscribe onUpdate callback to this config ID, if there is one
        if( configPath ) {
            fairCopy.services.configSubscribe(this.configPath,this.onUpdate)
        }
    }

    destroy() {
        // unsubscribe onUpdate callback
        fairCopy.services.configUnsubscribe(this.configPath,this.onUpdate)
    }

    createFromDoc(doc) {
        // TODO base on the document path
        this.configPath = "config-settings.json"  

        // populate it based on the tei document
        const initialState = this.generateInitialState(doc)
        fairCopy.services.configSubscribe(this.configPath,this.onUpdate,initialState)
    }

    setAttrState(elementName,attrName,nextAttrState) {        
        const nextState = { ...this.state }
        nextState.elements[elementName].attrState[attrName] = nextAttrState
        this.setState(nextState)        
    }

    setVocabState(vocabName,nextVocabState) {
        const nextState = { ...this.state }
        nextState.vocabs[vocabName] = nextVocabState
        this.setState(nextState)        
    }

    getDefaultVocabKey(elementName,attributeName) {
        return `${elementName}[${attributeName}]`
    }

    getVocab(elementName,attrName) {
        // TODO mix-in the valList from the attribute spec
        const vocabID = this.state.elements[elementName].attrState[attrName].vocabID
        const vocab = ( vocabID && this.state.vocabs[vocabID]) ? this.state.vocabs[vocabID] : []
        return { vocabID, vocab } 
    }

    generateInitialState(doc) {
        const { teiSchema, subDocIDs } = this.teiDocument
        const initialState = { elements: {}, vocabs: {} }
        const { elements, vocabs } = initialState

        const compareToActive = ( element ) => {
            const {attrs, type} = element
            const {name} = type
            for( const attrName of Object.keys(attrs)) {
                const val = attrs[attrName]
                if( val && val !== "" ) {
                    if( elements[name].attrState[attrName] ) {
                        elements[name].attrState[attrName].active = true
                        // populate the vocabulary with any existing values
                        if( teiSchema.attrs[attrName].dataType === "teidata.enumerated" ) {
                            const vocabID = this.getDefaultVocabKey(name,attrName)
                            const vocabEntry = vocabs[vocabID]
                            const valEntry = [val,'']
                            if( vocabEntry ) {
                                // unique values only
                                if( !vocabEntry.find( v => v[0] === val ) ) {
                                    vocabEntry.push(valEntry)
                                }
                            } else {
                                vocabs[vocabID] = [valEntry]
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

        // intialize the elements
        for( const element of Object.values(teiSchema.elements) ) {
            const { validAttrs } = element
            const configElement = {
                attrState: {}
            }
            if( validAttrs ) {
                for( const attr of validAttrs ) {
                    configElement.attrState[attr] = { active: false }
                }    
            }
            elements[element.name] = configElement
        }

        // scan the main doc
        scanNode(doc)

        // scan any subdocs
        for( const subDocID of subDocIDs ) {
            const noteJSON = JSON.parse( localStorage.getItem(subDocID) )
            const subDoc = teiSchema.schema.nodeFromJSON(noteJSON);
            scanNode(subDoc)
        }

        return initialState
    }

    onUpdate = (nextState) => {
        // receive next state from main process, update state
        this.state = nextState

        // create a trivial editor state update to push new state
        const {editorView} = this.teiDocument
        if( editorView ) {
            const {state} = editorView
            editorView.dispatch(state.tr)            
        }  
    }

    setState(nextState) {
        // send next state to main process
        fairCopy.services.updateConfig(this.configPath, nextState)
    }

}