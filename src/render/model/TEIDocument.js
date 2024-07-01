import {EditorState, TextSelection } from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "./basekeymap"
import {highlighter} from "./highlighter"
import {searchHighlighter} from "./search-highlighter"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"
import { v4 as uuidv4 } from 'uuid'

import {teiHeaderTemplate, teiTextTemplate, teiStandOffTemplate, teiSourceDocTemplate } from "./tei-template"
import {parseText, proseMirrorToDOM, serializeText, addTextNodes} from "./xml"
import {applySystemFlags} from "./system-flags"
import {mapResource} from "./id-map"
import { generateGutterMarks, isGutterDirty } from './gutter-marks'

const fairCopy = window.fairCopy

export default class TEIDocument {

    constructor( resourceEntry, parentEntry, fairCopyProject, teiSchema=null ) {
        this.subDocs = {}
        this.subDocCounter = 0
        this.errorCount = 0
        this.editorView = null
        this.lastMessageID = null
        this.noteEditorView = null
        this.resourceEntry = resourceEntry
        this.parentEntry = parentEntry
        this.resourceID = resourceEntry.id
        this.resourceType = resourceEntry.type
        this.fairCopyProject = fairCopyProject
        this.teiSchema = teiSchema
        this.currentTreeNode = { editorGutterPos: null, editorGutterPath: null, treeID: "main" }
        this.selectedElements = []
        this.gutterMarkCache = null
        this.gutterMarkCacheDirty = true
        this.noteGutterMarkCache = null
        this.noteGutterMarkCacheDirty = true
        this.expandedGutter = true
        this.plugins = [
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            history(),
            highlighter(),
            searchHighlighter()
        ]
        this.initialState = this.editorInitialState()
        this.changedSinceLastSave = false
    }

    onResourceUpdated = ( eventType, resource ) => {
        if( eventType === 'resourceEntryUpdated' ) {
            const { id: targetResourceID } = resource
            if( this.resourceID === targetResourceID ) {
                this.resourceEntry = resource
                this.resourceID = this.resourceEntry.id  
                this.resourceType = this.resourceEntry.type    
            }
            if( this.parentEntry && this.parentEntry.id === targetResourceID ) {
                this.parentEntry = resource
            }
        }
        // TODO right now this only works for FacsDocument, make it work here too
        // else if( eventType === 'resourceContentUpdated' ) {
            // load updated content if we are in read only mode
            // if( !this.isEditable() ) {
                // const { resourceContent } = resource
                // this.load(resourceContent)
            // }
        // }
    }

    isEditable() {
        return this.fairCopyProject.isEditable( this.resourceEntry )
    }

    getTEISchema() {
        return this.fairCopyProject ? this.fairCopyProject.teiSchema : this.teiSchema
    }

    editorInitialState() {
        // load blank XML template 
        const parser = new DOMParser();
        const teiTemplate = this.resourceType === 'text' ? teiTextTemplate : this.resourceType === 'standOff' ? teiStandOffTemplate : this.resourceType === 'sourceDoc' ? teiSourceDocTemplate : teiHeaderTemplate('')
        this.xmlDom = parser.parseFromString(teiTemplate, "text/xml");        
        const doc = this.createEmptyDocument(document)
               
        return EditorState.create({ 
            doc, plugins: this.plugins
        })
    }

    issueSubDocumentID = () => {
        return `subdoc-${this.subDocCounter++}`
    }

    parseSubDocument(node, name, noteID) {
        const teiSchema = this.getTEISchema()
        // turn note into noteDoc
        let noteX = document.createElement(`${name}X`)
        noteX.innerHTML = node.innerHTML
        let noteDoc = document.createElement(`${name}Doc`)
        noteDoc.append(noteX)
        const subDoc = parseText(noteDoc,this,teiSchema,name)
        this.subDocs[noteID] = JSON.stringify(subDoc.toJSON());
    }

    serializeSubDocument( subDocID, name, attrs) {
        const teiSchema = this.getTEISchema()
        const noteJSON = JSON.parse( this.subDocs[subDocID] )
        const subDoc = teiSchema.docNodeSchemas[name].nodeFromJSON(noteJSON);
        // get the content of noteDoc, which is the only child of doc
        const noteDocFragment = subDoc.firstChild.content
        const domFragment = proseMirrorToDOM(noteDocFragment, this, teiSchema, name)
        let note = document.createElement(name)
        note.appendChild( domFragment.cloneNode(true) )
        for( const attrKey of Object.keys(attrs)) {
            const attrVal = attrs[attrKey]
            note.setAttribute(attrKey,attrVal)
        }
        return note
    }

    hasID = (targetID) => {       
        const localID = this.parentEntry ? this.parentEntry.localID : this.resourceEntry.localID
        return this.fairCopyProject.hasID(targetID, localID) 
    }

    // called by dispatch transaction for every change to doc state
    onUpdate(transaction) {
        const { idMap } = this.fairCopyProject

        if( this.isEditable() ) {
            const resourceMap = mapResource( this.resourceEntry, transaction.doc )
            // update the ID Map
            idMap.setResourceMap(resourceMap,this.resourceEntry.localID, this.parentEntry?.localID)  
            // note unsaved state
            this.changedSinceLastSave = this.changedSinceLastSave || transaction.docChanged
        }
        
        // check if gutter cache is dirty
        if( !this.gutterMarkCacheDirty ) {
            this.gutterMarkCacheDirty = isGutterDirty( transaction )
        }

        // update editor state
        const nextEditorState = this.editorView.state.apply(transaction)
        this.editorView.updateState(nextEditorState)
    }

    setExpandedGutter(expanded) {
        if( this.expandedGutter !== expanded ) this.gutterMarkCacheDirty = true
        this.expandedGutter = expanded
    }

    getNoteGutterMarks(gutterTop) {
        // regenerate gutter marks if the document structure has changed
        if( this.noteGutterMarkCacheDirty ) {
            const { docNodes } = this.fairCopyProject.teiSchema.elementGroups
            const lastWidth = this.noteGutterMarkCache ? this.noteGutterMarkCache.totalWidth : null
            this.noteGutterMarkCache = generateGutterMarks( this.noteEditorView, this.expandedGutter, docNodes, gutterTop )
            this.noteGutterMarkCacheDirty = lastWidth !== this.noteGutterMarkCache.totalWidth
        }
        return this.noteGutterMarkCache
    }

    getGutterMarks() {
        // regenerate gutter marks if the document structure has changed
        if( this.gutterMarkCacheDirty ) {
            const { docNodes } = this.fairCopyProject.teiSchema.elementGroups
            // if the width changes, keep gutter dirty for one more refresh as editor re-lineates
            const lastWidth = this.gutterMarkCache ? this.gutterMarkCache.totalWidth : null
            this.gutterMarkCache = generateGutterMarks( this.editorView, this.expandedGutter, docNodes )
            this.gutterMarkCacheDirty = lastWidth !== this.gutterMarkCache.totalWidth
        }
        return this.gutterMarkCache
    }

    updateSystemFlags(transaction,onErrorCountChange) {
        const { idMap, teiSchema, fairCopyConfig } = this.fairCopyProject
        const relativeParentID = this.getRelativeParentID()
        const nextErrorCount = applySystemFlags(teiSchema,idMap,fairCopyConfig,relativeParentID,transaction)
        if( this.errorCount !== nextErrorCount ) {
            this.errorCount = nextErrorCount
            onErrorCountChange()
        }    
    }

    getRelativeParentID() {
        return this.parentEntry ? this.parentEntry.localID : this.resourceEntry.localID
    }

    finalizeEditorView(editorView) {
        this.editorView = editorView
        addTextNodes(editorView.state, editorView.dispatch)
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
        const teiSchema = this.getTEISchema()
        const doc = teiSchema.domParser.parse(div)
        return doc
    }

    openSubDocument( subDocID ) {
        const subDocJSON = JSON.parse( this.subDocs[subDocID] )
        const teiSchema = this.getTEISchema()
        const doc = teiSchema.schema.nodeFromJSON(subDocJSON);
        return EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: this.plugins
        })
    }

    createSubDocument = (documentDOM,docType) => {
        const teiSchema = this.getTEISchema()
        let noteDoc = documentDOM.createElement(`${docType}Doc`)
        const docX = documentDOM.createElement(`${docType}X`)
        const {defaultNodes} = teiSchema.elements[docType]
        if( defaultNodes ) {
            for( const defaultNodeName of defaultNodes ) {
                const defaultNode = documentDOM.createElement(defaultNodeName)
                docX.append(defaultNode)
            }
        }
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

    getActiveView() {
        // if the note editor is active, use it, otherwise use main view
        return this.noteEditorView ? this.noteEditorView : this.editorView
    }

    getActiveViewType() {
        return this.noteEditorView ? 'note' : 'main'
    }

    load( text ) {
        const parser = new DOMParser();
        const teiSchema = this.getTEISchema()
        this.xmlDom = parser.parseFromString(text, "text/xml");
 
        let doc
        if( this.resourceType === 'header' ) {
            const textEl = this.xmlDom.getElementsByTagName('teiHeader')[0] 
            doc = parseText(textEl,this,teiSchema,'header')
     
        } else if( this.resourceType === 'text' ) {
            const textEl = this.xmlDom.getElementsByTagName('text')[0] 
            doc = parseText(textEl,this,teiSchema,'text')    
        } else if( this.resourceType === 'standOff') {
            const textEl = this.xmlDom.getElementsByTagName('standOff')[0] 
            doc = parseText(textEl,this,teiSchema,'standOff')    
        } else if(this.resourceType === 'sourceDoc') {
            const textEl = this.xmlDom.getElementsByTagName('sourceDoc')[0] 
            doc = parseText(textEl,this,teiSchema,'sourceDoc')    
        } else {
            throw new Error("Attempted to load unknown document type.")
        }
 
        this.changedSinceLastSave = false
        this.initialState = EditorState.create({ 
            doc, plugins: this.plugins 
        })
        this.loading = false
    }

    saveSubDoc(subDocID, editorState) {
        const subDoc = editorState.doc
        this.subDocs[subDocID] = JSON.stringify(subDoc.toJSON());
    }

    abandonChanges() {
        this.changedSinceLastSave = false
        fairCopy.ipcSend('abandonResourceMap', this.resourceID)
    }

    previewDocument() {
        const previewEntry = this.parentEntry ? this.parentEntry : this.resourceEntry
        this.fairCopyProject.previewResource(previewEntry)
    }

    save() {
        const editorState = this.editorView.state
        const teiSchema = this.getTEISchema()
        
        const fileContents = serializeText(editorState.doc, this, teiSchema)

        const messageID = uuidv4()
        fairCopy.ipcSend('requestSave', messageID, this.resourceID, fileContents)
        this.lastMessageID = messageID
    
        this.changedSinceLastSave = false
    }
}