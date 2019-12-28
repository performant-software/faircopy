import {DOMSerializer} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"
import TEISchema from "./TEISchema"
import {teiTemplate} from "./tei-template"

const fs = window.fairCopy.fs

export default class TEIDocument {

    constructor() {
        this.subDocCounter = 0
        this.subDocPrefix = `note-${Date.now()}-`

        this.teiSchema = new TEISchema(this.issueSubDocumentID);
        const {schema} = this.teiSchema
        this.plugins = [
            buildInputRules(schema),
            keymap(buildKeymap(schema)),
            keymap(baseKeymap),
            dropCursor(),
            gapCursor(),
            history()
        ]
    }

    editorInitialState(documentDOM) {
        // load blank XML template 
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(teiTemplate, "text/xml");        
        const doc = this.createEmptyDocument(documentDOM)
       
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
        return `${this.subDocPrefix}${this.subDocCounter++}`
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

    load( filePath ) {
        const text = fs.readFileSync(filePath, "utf8")
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        const doc = this.teiSchema.domParser.parse(bodyEl)
        const selection = TextSelection.create(doc, 0)
        return EditorState.create({ 
            doc, plugins: this.plugins, selection 
        })

        // TODO db of attributes managed by this object
        // seperate module for parsing ODD file
        // configures the editor to provide
        // the tags supported by the schema
        // also embeds the technical documentation
        // in the correct language
    }

    save(editorView, saveFilePath) {
        // Override save file for testing
        if( process.env.REACT_APP_DEBUG_MODE) {
            saveFilePath = 'test-docs/je_example_out.xml'
        }

        const editorState = editorView.state
        this.teiSchema.teiMode = true

        // take the body of the document from prosemirror and reunite it with 
        // the rest of the xml document, then serialize to string
        const domSerializer = DOMSerializer.fromSchema( this.teiSchema.schema )
        const domFragment = domSerializer.serializeFragment(editorState.doc.content)
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        var div = document.createElement('div')
        div.appendChild( domFragment.cloneNode(true) )
        bodyEl.innerHTML = div.innerHTML
        const fileContents = new XMLSerializer().serializeToString(this.xmlDom);

        fs.writeFileSync(saveFilePath, fileContents, (err) => {
            if (err) {
                console.log(err)
            } 
        })
        this.teiSchema.teiMode = false
    }
}