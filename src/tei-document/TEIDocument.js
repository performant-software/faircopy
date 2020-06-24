import {DOMSerializer} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "./basekeymap"
import {highlighter} from "./highlighter"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"
import {teiTemplate} from "./tei-template"

const fairCopy = window.fairCopy

export default class TEIDocument {

    constructor( resourceID, fairCopyProject ) {
        this.editorView = null
        this.resourceID = resourceID
        this.fairCopyProject = fairCopyProject
        const {schema} = fairCopyProject.teiSchema
        this.plugins = [
            buildInputRules(schema),
            keymap(buildKeymap(schema)),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            history(),
            highlighter()
        ]
        if( resourceID ) {
            this.requestResource( resourceID )
        } else {
            this.initialState = this.editorInitialState()
        }
        this.changedSinceLastSave = false
    }

    editorInitialState() {
        // load blank XML template 
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(teiTemplate, "text/xml");        
        const doc = this.createEmptyDocument(document)
               
        const selection = TextSelection.create(doc, 0)
        return EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
    }

    // TODO separate module?
    fairCopyKeyMap() {
        // "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
        // the function of the enter key is dependent upon the current editor mode
        // need to understand how this presently works and then develop a scheme
        // to interrupt and put the correct node type in there depending on the circumstance
        return baseKeymap
    }

    hasID(targetID) {       
        const editorState = this.editorView.state
        const {doc} = editorState
        let found = false
    
        const findID = (element) => {
            const xmlID = element.attrs['xml:id']
            if( targetID === xmlID ) {
                found = true
            }
        }
        
        // gather up all xml:ids and their nodes/marks
        doc.descendants((node) => {
            if( findID(node) ) return false
            for( const mark of node.marks ) {
                if( findID(mark) ) return false
            }        
            return true
        })

        return found
    }

    refreshView = () => {
        // dispatch a blank transaction to force a display update of the subcomponents
        if( this.editorView ) {
            const { tr } = this.editorView.state
            this.editorView.dispatch(tr)    
        }
    }

    createEmptyDocument(documentDOM) {
        const div = documentDOM.createElement('DIV')
        div.innerHTML = ""
        const doc = this.fairCopyProject.teiSchema.domParser.parse(div)
        return doc
    }

    moveSubDocument( oldKey, newKey ) {
        const subDoc = localStorage.getItem(oldKey);
        localStorage.setItem(newKey, subDoc);
        localStorage.setItem(oldKey, null);
    }

    createSubDocument(documentDOM) {
        const subDoc = this.createEmptyDocument(documentDOM)
        const { teiSchema } = this.fairCopyProject
        const subDocID = teiSchema.issueSubDocumentID()
        localStorage.setItem(subDocID, JSON.stringify(subDoc.toJSON()));
        return subDocID
    }

    getVocab(elementName,attrName) {
        const { fairCopyConfig } = this.fairCopyProject
        const vocabID = fairCopyConfig.elements[elementName].attrState[attrName].vocabID
        const vocab = ( vocabID && fairCopyConfig.vocabs[vocabID]) ? fairCopyConfig.vocabs[vocabID] : []
        return { vocabID, vocab } 
    }

    requestResource( resourceID ) {
        fairCopy.services.ipcSend('requestResource', resourceID )
        this.loading = true
    }

    load( text ) {
        const parser = new DOMParser();
        const { teiSchema } = this.fairCopyProject
        this.xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        const doc = teiSchema.domParser.parse(bodyEl)
        const selection = TextSelection.create(doc, 0)
        this.changedSinceLastSave = false
        this.initialState = EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
        this.loading = false
    }

    openNote( noteID ) {
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const { teiSchema } = this.fairCopyProject
        const doc = teiSchema.schema.nodeFromJSON(noteJSON);
        return EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: this.plugins
        })
    }

    save() {

        // TODO - program should clear sub docs from local storage before exiting or when loading a different document

        const editorState = this.editorView.state
        const { teiSchema, idMap } = this.fairCopyProject
        teiSchema.teiMode = true

        // take the body of the document from prosemirror and reunite it with 
        // the rest of the xml document, then serialize to string
        const domSerializer = DOMSerializer.fromSchema( teiSchema.schema )
        const domFragment = domSerializer.serializeFragment(editorState.doc.content)
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        var div = document.createElement('div')
        div.appendChild( domFragment.cloneNode(true) )
        bodyEl.innerHTML = div.innerHTML
        const fileContents = new XMLSerializer().serializeToString(this.xmlDom);
        fairCopy.services.ipcSend('requestSave', this.resourceID, fileContents)

        const localID = this.fairCopyProject.getLocalID(this.resourceID)
        idMap.mapTextIDs(localID,editorState.doc)
        idMap.save()

        teiSchema.teiMode = false
        this.changedSinceLastSave = false
    }
}