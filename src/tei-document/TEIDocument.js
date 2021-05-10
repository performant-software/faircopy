import {EditorState, TextSelection } from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "./basekeymap"
import {highlighter} from "./highlighter"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"
import { v4 as uuidv4 } from 'uuid'

import {teiHeaderTemplate, teiTextTemplate } from "./tei-template"
import {parseText, proseMirrorToDOM, serializeText, addTextNodes} from "./xml"
import {scanForErrors} from "./error-scan"

const fairCopy = window.fairCopy

export default class TEIDocument {

    constructor( resourceID, resourceType, fairCopyProject ) {
        this.subDocs = {}
        this.subDocCounter = 0
        this.editorView = null
        this.lastMessageID = null
        this.noteEditorView = null
        this.resourceID = resourceID
        this.resourceType = resourceType
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
        const teiTemplate = this.resourceType === 'text' ? teiTextTemplate : teiHeaderTemplate('')
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

    parseSubDocument(node, name, noteID) {
        const {teiSchema} = this.fairCopyProject
        // turn note into noteDoc
        let noteX = document.createElement(`${name}X`)
        noteX.innerHTML = node.innerHTML
        let noteDoc = document.createElement(`${name}Doc`)
        noteDoc.append(noteX)
        const subDoc = parseText(noteDoc,this,teiSchema,name)
        this.subDocs[noteID] = JSON.stringify(subDoc.toJSON());
    }

    serializeSubDocument(name, attrs) {
        const {teiSchema} = this.fairCopyProject
        let {__id__} = attrs; 
        const noteJSON = JSON.parse( this.subDocs[__id__] )
        const subDoc = teiSchema.docNodeSchemas[name].nodeFromJSON(noteJSON);
        // get the content of noteDoc, which is the only child of doc
        const noteDocFragment = subDoc.firstChild.content
        const domFragment = proseMirrorToDOM(noteDocFragment, this, teiSchema, name)
        let note = document.createElement(name)
        note.appendChild( domFragment.cloneNode(true) )
        for( const attrKey of Object.keys(attrs)) {
            if( attrKey !== '__id__') {
                const attrVal = attrs[attrKey]
                note.setAttribute(attrKey,attrVal)
            }
        }
        return note
    }

    hasID = (targetID) => {       
        const editorState = this.editorView.state
        const {doc} = editorState
        let found = false

        // check to see if this ID exists in the parent resource
        if( this.fairCopyProject.siblingHasID(targetID, this.resourceID) ) return true 
    
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

    // called by dispatch transaction for every change to doc state
    onUpdate(transaction) {
        const { idMap, teiSchema } = this.fairCopyProject
        const resourceEntry = this.fairCopyProject.getResourceEntry(this.resourceID)
        const parentEntry = this.fairCopyProject.getParent(resourceEntry)

        // update the ID Map
        const resourceMap = idMap.mapResource( 'text', transaction.doc )
        idMap.setMap(resourceMap,resourceEntry.localID, parentEntry?.localID)
        idMap.update()
        
        // scan for attribute errors
        const relativeParentID = this.getRelativeParentID()
        scanForErrors(teiSchema,idMap,relativeParentID,transaction)

        // update editor state
        const nextEditorState = this.editorView.state.apply(transaction)
        this.editorView.updateState(nextEditorState)
        this.changedSinceLastSave = this.changedSinceLastSave || transaction.docChanged
    }

    getRelativeParentID() {
        const resourceEntry = this.fairCopyProject.getResourceEntry(this.resourceID)
        const parentEntry = this.fairCopyProject.getParent(resourceEntry)
        return parentEntry ? parentEntry.localID : resourceEntry.localID
    }

    finalizeEditorView(editorView) {
        this.editorView = editorView
        addTextNodes(editorView)
        this.changedSinceLastSave = false
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

    openSubDocument( subDocID ) {
        const subDocJSON = JSON.parse( this.subDocs[subDocID] )
        const { teiSchema } = this.fairCopyProject
        const doc = teiSchema.schema.nodeFromJSON(subDocJSON);
        return EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: this.plugins
        })
    }

    createSubDocument(documentDOM,docType) {
        const { teiSchema } = this.fairCopyProject
        let noteDoc = documentDOM.createElement(`${docType}Doc`)
        const docX = documentDOM.createElement(`${docType}X`)
        const add = documentDOM.createElement('add')
        const del = documentDOM.createElement('del')
        docX.append(add)
        docX.append(del)
        noteDoc.append(docX)
        const subDoc = parseText(noteDoc,this,teiSchema,docType)

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

    getParent() {
        const resourceEntry = this.fairCopyProject.getResourceEntry( this.resourceID )
        return this.fairCopyProject.getParent(resourceEntry)
    }

    load( text ) {
        const parser = new DOMParser();
        const { teiSchema } = this.fairCopyProject
        this.xmlDom = parser.parseFromString(text, "text/xml");
 
        let doc
        if( this.resourceType === 'header' ) {
            const textEl = this.xmlDom.getElementsByTagName('teiHeader')[0] 
            doc = parseText(textEl,this,teiSchema,'header')
     
        } else {
            const textEl = this.xmlDom.getElementsByTagName('text')[0] 
            doc = parseText(textEl,this,teiSchema)    
        }
 
        const selection = TextSelection.create(doc, 0)
        this.changedSinceLastSave = false
        this.initialState = EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
        this.loading = false
    }

    saveSubDoc(subDocID, editorState) {
        const subDoc = editorState.doc
        this.subDocs[subDocID] = JSON.stringify(subDoc.toJSON());
    }

    abandonChanges() {
        this.changedSinceLastSave = false
        fairCopy.services.ipcSend('abandonResourceMap', this.resourceID)
    }

    save() {
        const editorState = this.editorView.state
        const { teiSchema } = this.fairCopyProject
        
        const fileContents = serializeText(editorState.doc, this, teiSchema)

        const messageID = uuidv4()
        fairCopy.services.ipcSend('requestSave', messageID, this.resourceID, fileContents)
        this.lastMessageID = messageID

        this.changedSinceLastSave = false
    }
}