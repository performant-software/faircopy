import {DOMSerializer} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"
import {EditorView } from "prosemirror-view"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "./basekeymap"
import {highlighter} from "./highlighter"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"
import TEISchema from "./TEISchema"
import {teiTemplate} from "./tei-template"
import FairCopyConfig from "./FairCopyConfig"

const fairCopy = window.fairCopy

export default class TEIDocument {

    constructor(onStateChange) {
        this.subDocIDs = []
        this.subDocCounter = 0
        this.subDocPrefix = `note-${Date.now()}-`
        this.onStateChange = onStateChange
        this.teiSchema = new TEISchema(this.issueSubDocumentID);
        const {schema} = this.teiSchema
        this.plugins = [
            buildInputRules(schema),
            keymap(buildKeymap(schema)),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            history(),
            highlighter()
        ]
    }

    editorInitialState() {
        // load blank XML template 
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(teiTemplate, "text/xml");        
        const doc = this.createEmptyDocument(document)

        this.fairCopyConfig = new FairCopyConfig(this)
        this.fairCopyConfig.createNew()
       
        const selection = TextSelection.create(doc, 0)
        return EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
    }

    refreshView = () => {
        // dispatch a blank transaction to force a display update of the subcomponents
        if( this.editorView ) {
            const { tr } = this.editorView.state
            this.editorView.dispatch(tr)    
        }
    }

    createEditorView = (onClick,element) => {
        if( this.editorView ) return;

        this.editorView = new EditorView( 
            element,    
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: this.editorInitialState(),
                handleClickOn: onClick,
                transformPastedHTML: this.teiSchema.transformPastedHTML,
                transformPasted: this.teiSchema.transformPasted,
                clipboardSerializer: this.createClipboardSerializer()
            }
        )
        this.editorView.focus()
    }

    dispatchTransaction = (transaction) => {
        if( this.editorView ) {
            const editorState = this.editorView.state
            const nextEditorState = editorState.apply(transaction)
            this.editorView.updateState(nextEditorState)
            this.changedSinceLastSave = this.changedSinceLastSave || transaction.docChanged
            this.onStateChange(nextEditorState)
        }
    }

    // TODO separate module?
    fairCopyKeyMap() {
        // "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
        // the function of the enter key is dependent upon the current editor mode
        // need to understand how this presently works and then develop a scheme
        // to interrupt and put the correct node type in there depending on the circumstance
        return baseKeymap
    }

    createClipboardSerializer() {
        // clipboard serialize always serializes to TEI XML
        const clipboardSchema = new TEISchema();
        clipboardSchema.teiMode = true
        return DOMSerializer.fromSchema( clipboardSchema.schema )
    }

    createEmptyDocument(documentDOM) {
        const div = documentDOM.createElement('DIV')
        div.innerHTML = ""
        const doc = this.teiSchema.domParser.parse(div)
        return doc
    }

    issueSubDocumentID = () => {
        const nextID = `${this.subDocPrefix}${this.subDocCounter++}`
        this.subDocIDs.push(nextID)
        return nextID
    }

    moveSubDocument( oldKey, newKey ) {
        const subDoc = localStorage.getItem(oldKey);
        localStorage.setItem(newKey, subDoc);
        localStorage.setItem(oldKey, null);
    }

    createSubDocument(documentDOM) {
        const subDoc = this.createEmptyDocument(documentDOM)
        const subDocID = this.issueSubDocumentID()
        localStorage.setItem(subDocID, JSON.stringify(subDoc.toJSON()));
        return subDocID
    }

    getXMLIDs() {
        if( this.editorView ) {
            const { doc } = this.editorView.state
            return this.getXMLIDsInDoc(doc)
        }
        return null
    }

    getXMLIDsInDoc(doc) {
        const xmlIDs = []

        const gatherID = (element) => {
            const xmlID = element.attrs['xml:id']
            if( xmlID ) xmlIDs.push(`#${xmlID}`)
        }
        
        // gather up all xml:ids and their nodes/marks
        doc.descendants((node) => {
            gatherID(node)
            for( const mark of node.marks ) {
                gatherID(mark)
            }        
            return true
        })

        return xmlIDs.sort()
    }

    findID(targetID) {
        if( this.editorView ) {
            const { doc } = this.editorView.state
            return this.findIDInDoc(doc,targetID)
        }
        return null
    }

    findIDInDoc(doc,targetID) {

        const findID = (element) => {
            const xmlID = element.attrs['xml:id']
            return ( xmlID && xmlID === targetID ) ? element : null
        }
        
        let result = null

        doc.descendants((node) => {
            if( !result ) {
                result = findID(node)
                if( !result ) {
                    for( const mark of node.marks ) {
                        result = findID(mark)
                        if( result ) break 
                    }        
                }
            } 
            return (result === null)
        })

        return result
    }

    load( filePath ) {
        const text = fairCopy.services.readFileSync(filePath)
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        // TODO load the config path from the TEI header
        const doc = this.teiSchema.domParser.parse(bodyEl)
        const selection = TextSelection.create(doc, 0)
        this.fairCopyConfig = new FairCopyConfig(this)
        this.fairCopyConfig.createFromDoc(doc)
        this.changedSinceLastSave = false
        return EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })
    }

    openNote( noteID ) {
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const doc = this.teiSchema.schema.nodeFromJSON(noteJSON);
        // TODO determine configPath
        this.fairCopyConfig = new FairCopyConfig(this,"config-settings.json")
        return EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: this.plugins
        })
    }

    save(saveFilePath) {
        // Override save file for testing
        if( fairCopy.services.isDebugMode() ) {
            saveFilePath = 'test-docs/je_example_out.xml'
        }

        // TODO - program should clear sub docs from local storage before exiting or when loading a different document

        const editorState = this.editorView.state
        this.teiSchema.teiMode = true

        // take the body of the document from prosemirror and reunite it with 
        // the rest of the xml document, then serialize to string
        // TODO add application element with config ID
        const domSerializer = DOMSerializer.fromSchema( this.teiSchema.schema )
        const domFragment = domSerializer.serializeFragment(editorState.doc.content)
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        var div = document.createElement('div')
        div.appendChild( domFragment.cloneNode(true) )
        bodyEl.innerHTML = div.innerHTML
        const fileContents = new XMLSerializer().serializeToString(this.xmlDom);

        fairCopy.services.writeFileSync(saveFilePath, fileContents)
        this.teiSchema.teiMode = false
        this.changedSinceLastSave = false
    }
}