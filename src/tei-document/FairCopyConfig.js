const fairCopy = window.fairCopy

export default class FairCopyConfig {

    constructor(teiDocument, configID) {
        this.configID = configID
        this.teiDocument = teiDocument
        this.state = null
        // subscribe onUpdate callback to this config ID, if there is one
        if( configID ) {
            fairCopy.services.configSubscribe(this.configID,this.onUpdate)
        }
    }

    destroy() {
        // unsubscribe onUpdate callback
        fairCopy.services.configUnsubscribe(this.configID,this.onUpdate)
    }

    create(doc) {
        // create a relative URI with a GUID 
        this.configID = `config-${Date.now()}`

        // subscribe to state updates (from other documents and processes)
        // fairCopy.services.configSubscribe(this.configID,this.onUpdate)

        // populate it based on the tei document
        this.populateActiveAttrs(doc)
    }

    setAttrState(elementName,attrName,nextAttrState) {        
        // update config state
        const nextState = { ...this.state }
        nextState.elements[elementName].attrState[attrName] = nextAttrState
        this.setState(nextState)        
    }

    populateActiveAttrs(doc) {
        const { teiSchema, subDocIDs } = this.teiDocument
        const nextState = { elements: {} }
        const { elements } = nextState

        function compareToActive( element ) {
            const {attrs, type} = element
            const {name} = type
            for( const attrName of Object.keys(attrs)) {
                const val = attrs[attrName]
                if( val && val !== "" ) {
                    if( elements[name].attrState[attrName] ) {
                        elements[name].attrState[attrName].active = true
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

        this.setState(nextState)
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
        // fairCopy.services.updateConfig(this.configID, nextState)
        this.onUpdate(nextState)
    }

}

// TODO - program should clear sub docs from local storage before exiting or when loading a different document

// const configSchema = {
//     id, //(generated GUID by default)
//     name, //human readable name
//     type, //local or published (published are refreshed on load)
//     elements: {
//         attrs 
//     },
//     vocabs: {
//         name: {
//             name,
//             target, //  *[rend] or name[type]
//             src, // (load from JSON-LD data source)
//             type, // closed, semiopen, open
//             values: [
//                 {
//                     ident,
//                     description
//                 }
//             ]
//         }
//     }
// }