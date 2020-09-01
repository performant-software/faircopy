import {EditorState, TextSelection} from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "./basekeymap"
import {highlighter} from "./highlighter"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

import {teiTemplate} from "./tei-template"

const fairCopy = window.fairCopy

export default class TEIDocument {

    constructor( resourceID, fairCopyProject ) {
        this.subDocs = {}
        this.subDocCounter = 0
        this.editorView = null
        this.noteEditorView = null
        this.resourceID = resourceID
        this.fairCopyProject = fairCopyProject
        this.plugins = [
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

    issueSubDocumentID = () => {
        return `subdoc-${this.subDocCounter++}`
    }

    parseSubDocument(node, noteID) {
        const {teiSchema} = this.fairCopyProject
        const subDoc = teiSchema.parseBody(node,this)
        this.subDocs[noteID] = JSON.stringify(subDoc.toJSON());
    }

    serializeSubDocument(attrs) {
        const {teiSchema} = this.fairCopyProject
        let {__id__} = attrs; 
        const noteJSON = JSON.parse( this.subDocs[__id__] )
        const subDoc = teiSchema.schema.nodeFromJSON(noteJSON);
        const domFragment = teiSchema.serializeBody(subDoc.content, this)
        let note = document.createElement('note')
        note.appendChild( domFragment.cloneNode(true) )
        for( const attrKey of Object.keys(attrs)) {
            if( attrKey !== '__id__') {
                const attrVal = attrs[attrKey]
                note.setAttribute(attrKey,attrVal)
            }
        }
        return note
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

    openSubDocument( noteID ) {
        const noteJSON = JSON.parse( this.subDocs[noteID] )
        const { teiSchema } = this.fairCopyProject
        const doc = teiSchema.schema.nodeFromJSON(noteJSON);
        return EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: this.plugins
        })
    }

    createSubDocument(documentDOM) {
        const subDoc = this.createEmptyDocument(documentDOM)
        const subDocID = this.issueSubDocumentID()
        this.subDocs[subDocID] = JSON.stringify(subDoc.toJSON())
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

    getActiveView() {
        // if the note editor is active, use it, otherwise use main view
        return this.noteEditorView ? this.noteEditorView : this.editorView
    }

    load( text ) {
        const parser = new DOMParser();
        const { teiSchema } = this.fairCopyProject
        this.xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        const doc = teiSchema.parseBody(bodyEl,this)
        const selection = TextSelection.create(doc, 0)
        this.changedSinceLastSave = false
        this.initialState = EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
        this.loading = false
    }

    saveNote(noteID, editorState) {
        const subDoc = editorState.doc
        this.subDocs[noteID] = JSON.stringify(subDoc.toJSON());
    }

    save() {
        const editorState = this.editorView.state
        const { teiSchema, idMap } = this.fairCopyProject
        teiSchema.teiMode = true

        // take the body of the document from prosemirror and reunite it with 
        // the rest of the xml document, then serialize to string
        const domFragment = teiSchema.serializeBody(editorState.doc.content, this)
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