import {Schema, DOMParser as PMDOMParser } from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"
import {EditorState, TextSelection} from "prosemirror-state"
import {keymap} from "prosemirror-keymap"
import {history, undo, redo} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {Plugin} from "prosemirror-state"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"

import {buildKeymap} from "./keymap"
import {buildInputRules} from "./inputrules"

const fs = window.nodeAppDependencies.fs

const teiTemplate = `<?xml version="1.0" encoding="UTF-8"?>
    <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
            <fileDesc>
                <titleStmt>
                    <title></title>
                </titleStmt>
                <publicationStmt>
                    <publisher/>
                    <pubPlace/>
                    <date/>
                    <authority/>
                <availability>
                    <p/> 
                    </availability>
            </publicationStmt>
                <sourceDesc>
                <p/>
                </sourceDesc>
            </fileDesc>
        </teiHeader>
    <text>
        <body></body>
    </text>
    </TEI>
`

export default class TEIDocument {

    constructor() {
        this.subDocCounter = 0
        this.subDocPrefix = `note-${Date.now()}-`
        this.teiMode = false

        this.elementSpecs = {
            "p": {
                "doc": "marks paragraphs in prose.",
            },
            "pb": {
                "docs": "marks the beginning of a new page in a paginated document."
            },
            "note": {
                "docs": "contains a note or annotation.",
            },
            "hi": {
                "attrs": {
                    "rend": {
                        "type": "select",
                        "options": ["bold","italic","caps"]
                    }
                },
                "docs": "marks a word or phrase as graphically distinct from the surrounding text, for reasons concerning which no claim is made.",
            },
            "ref": {
                "docs": "defines a reference to another location, possibly modified by additional text or comment.",
            },
            "name": {
                "docs": "contains a proper noun or noun phrase.",
                "attrs": {
                    "type": {
                        "type": "select",
                        "options": ["person","place","artwork"]
                    }
                },
            }
        }
        this.defaultAttrSpec = {
            "type": "text"
        }


        const nodes = {
            doc: {
                content: "block+"
            },
            p: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "p"}],
                toDOM: () => this.teiMode ? ["p",0] : ["tei-p",0]        
            },
            pb: {
                inline: true,
                group: "inline",
                attrs: {
                    facs: { default: '' }
                },
                parseDOM: [{
                    tag: "pb",
                    getAttrs: (domNode) => {
                        const facs = domNode.getAttribute("facs")
                        return { facs }
                    }
                }],
                toDOM: (node) => {
                    if( this.teiMode ) {
                        const attrs = this.filterOutBlanks(node.attrs)
                        return ["pb",attrs]
                    } else {
                        const pbAttrs = { ...node.attrs, class: "fa fa-file-alt" }
                        return ["tei-pb",pbAttrs,0]  
                    }
                }  
            },
            note: {
                inline: true,
                group: "inline",
                attrs: {
                    id: { }
                },
                parseDOM: [
                    {
                        tag: "note",
                        getAttrs: (domNode) => {
                            const noteID = domNode.getAttribute("xml:id")
                            this.parseSubDocument(domNode, noteID)
                            return { id: noteID }
                        },
                    }
                ],
                toDOM: (node) => { 
                    let {id} = node.attrs; 
                    if( this.teiMode ) {
                        return this.serializeSubDocument(id)
                    } else {
                        const noteAttrs = { ...node.attrs, class: "fas fa-xs fa-sticky-note" }
                        return ["tei-note",noteAttrs,0]
                    }
                }
            },   
            text: {
                group: "inline"
            },
        }

        const marks = {   
            hi: this.createTEIMark({ name: 'hi', attrs: [ "rend" ] }),
            ref: this.createTEIMark({ name: 'ref', attrs: [ "target" ] }),
            name: this.createTEIMark({ name: 'name', attrs: [ "id", "type" ] })
        }

        this.xmlSchema = new Schema({ nodes, marks })
    }

    filterOutBlanks( attrObj ) {
        // don't save blank attrs
        const attrs = {}
        for( const key of Object.keys(attrObj) ) {
            const value = attrObj[key]
            if( value && value.length > 0 ) {
                attrs[key] = value
            }
        }
        return attrs
    }

    createTEIMark(teiMarkSpec) {
        const { name } = teiMarkSpec

        let attrs = {}
        for( let attr of teiMarkSpec.attrs ) {
            attrs[attr] = { default: '' }
        }

        return {
            attrs,
            parseDOM: [
                {
                    tag: name,
                    getAttrs(dom) {
                        let parsedAttrs = {}
                        for( let attr of teiMarkSpec.attrs ) {
                            parsedAttrs[attr] = dom.getAttribute(attr)
                        }
                        return parsedAttrs
                    }
                } 
            ],
            toDOM: (mark) => {
                if( this.teiMode ) {
                    const attrs = this.filterOutBlanks(mark.attrs)
                    return [name,attrs,0]
                } else {
                    const displayAttrs = { ...mark.attrs, phraseLvl: true }
                    return [`tei-${name}`,displayAttrs,0]
                }
            } 
        }       
    }

    editorInitialState(documentDOM) {
        // load blank XML template 
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(teiTemplate, "text/xml");        
        const doc = this.createEmptyDocument(documentDOM)
        const plugins = this.pluginSetup()
        const selection = TextSelection.create(doc, 0)
        return EditorState.create({ 
            doc, plugins, selection 
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

    createEmptyDocument(documentDOM) {
        const div = documentDOM.createElement('DIV')
        div.innerHTML = ""
        const doc = PMDOMParser.fromSchema(this.xmlSchema).parse(div)
        return doc
    }

    issueSubDocumentID() {
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

    parseSubDocument(node, noteID) {
        const subDoc = PMDOMParser.fromSchema(this.xmlSchema).parse(node)
        localStorage.setItem(noteID, JSON.stringify(subDoc.toJSON()));
    }

    serializeSubDocument(noteID) {
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const subDoc = this.xmlSchema.nodeFromJSON(noteJSON);
        const domSerializer = DOMSerializer.fromSchema( this.xmlSchema )
        const domFragment = domSerializer.serializeFragment(subDoc.content)
        let note = document.createElement('note')
        note.setAttribute('xml:id', noteID)
        note.appendChild( domFragment.cloneNode(true) )
        return note
    }

    pluginSetup() {
        let plugins = [
            buildInputRules(this.xmlSchema),
            keymap(buildKeymap(this.xmlSchema)),
            keymap(this.fairCopyKeyMap()),
            dropCursor(),
            gapCursor(),
            keymap({"Mod-z": undo, "Mod-y": redo}),
            history()
        ]
      
        return plugins.concat(new Plugin({
            props: {
                attributes: {class: "ProseMirror-example-setup-style"}
            }
        }))
    }

    load( filePath ) {
        const text = fs.readFileSync(filePath, "utf8")
        const parser = new DOMParser();
        this.xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        const doc = PMDOMParser.fromSchema(this.xmlSchema).parse(bodyEl)
        const plugins = this.pluginSetup()
        const selection = TextSelection.create(doc, 0)
        return EditorState.create({ 
            doc, plugins, selection 
        })

        // TODO db of attributes managed by this object
        // seperate module for parsing ODD file
        // configures the editor to provide
        // the tags supported by the schema
        // also embeds the technical documentation
        // in the correct language
    }

    hasChanged(editorView) {

        // TODO determined if the file has changed

        return true
        // const editorState = editorView.state
        // this.teiMode = true

        // const domSerializer = DOMSerializer.fromSchema( this.xmlSchema )
        // const domFragment = domSerializer.serializeFragment(editorState.doc.content)



        // const bodyEl = this.xmlDom.getElementsByTagName('body')[0]
        // var div = document.createElement('div')
        // div.appendChild( domFragment.cloneNode(true) )
        // bodyEl.innerHTML = div.innerHTML
        // const fileContents = new XMLSerializer().serializeToString(this.xmlDom);

    }

    save(editorView, saveFilePath) {
        // Override save file for testing
        if( process.env.REACT_APP_DEBUG_MODE) {
            saveFilePath = 'test-docs/je_example_out.xml'
        }

        const editorState = editorView.state
        this.teiMode = true

        // take the body of the document from prosemirror and reunite it with 
        // the rest of the xml document, then serialize to string
        const domSerializer = DOMSerializer.fromSchema( this.xmlSchema )
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
        this.teiMode = false
    }

}