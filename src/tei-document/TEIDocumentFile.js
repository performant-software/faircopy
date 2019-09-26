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

export default class TEIDocumentFile {

    constructor() {
        this.subDocCounter = 0
        // TODO add a timestamp to the prefix
        this.subDocPrefix = 'subdoc-'
        this.teiMode = false
        this.subDocuments = {}

        const nodes = {
            doc: {
                content: "block+"
            },
            paragraph: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "p"}],
                toDOM: () => this.teiMode ? ["p",0] : ["tei-p",0]        
            },
            pb: {
                inline: true,
                group: "inline",
                parseDOM: [{tag: "pb"}],
                toDOM: () => this.teiMode ? ["pb"] : ["tei-pb", " "]     
            },
            line: {
                content: "inline*",
                group: "line",
                parseDOM: [{tag: "l"}],
                toDOM: () => this.teiMode ? ["l",0] : ["tei-l", 0]
            },
            lineGroup: {
                content: "line+",
                group: "block",
                parseDOM: [{tag: "lg"}],
                toDOM: () => this.teiMode ? ["lg",0] : ["tei-lg", 0]
            },
            note: {
                inline: true,
                group: "inline",
                attrs: {
                    id: {},
                    subDocID: {}
                },
                parseDOM: [
                    {
                        tag: "note",
                        getAttrs: (domNode) => {
                            const subDocID = this.parseSubDocument(domNode)
                            const noteID = domNode.getAttribute("xml:id")
                            return {id: noteID, subDocID }
                        },
                    }
                ],
                toDOM: (node) => { 
                    let {subDocID} = node.attrs; 
                    if( this.teiMode ) {
                        return this.serializeSubDocument(subDocID)
                    } else {
                        return ["tei-note", "†"] 
                    }
                }
            },   
            text: {
                group: "inline"
            },
        }

        const marks = {
            add: {
                parseDOM: [
                    {
                        tag: "add"
                    } 
                ],
                toDOM: (mark) => this.teiMode ? ["add",mark.attrs,0] : ["tei-add",0]        
            },
            del: {
                attrs: {
                    resp: { default: '' }    
                },
                parseDOM: [
                    {
                        tag: "del"
                    }
                ],
                toDOM: (mark) => this.teiMode ? ["del",mark.attrs,0] : ["tei-del",0]  
            },
            name: {
                attrs: {
                    type: {}    
                },
                parseDOM: [
                    {
                        tag: "name",
                        getAttrs(dom) {
                            return {type: dom.getAttribute("type")}
                        }
                    }
                ],
                toDOM: (mark) => this.teiMode ? ["name",mark.attrs,0]  : ["tei-name",0]   
            },         
            ref: {
                attrs: {
                    target: { default: '' }
                },
                parseDOM: [
                    {
                        tag: "ref"
                    } 
                ],
                toDOM: (mark) => this.teiMode ? ["ref",mark.attrs,0] : ["tei-ref",0] 
            }
        }

        this.xmlSchema = new Schema({ nodes, marks })
    }

    editorInitialState(documentDOM) {
        return this.load('test-docs/je_example.xml')
        // const div = documentDOM.createElement('DIV')
        // div.innerHTML = ""
        // const doc = PMDOMParser.fromSchema(this.xmlSchema).parse(div)
        // const plugins = this.pluginSetup()
        // const selection = TextSelection.create(doc, 0)
        // return EditorState.create({ 
        //     doc, plugins, selection 
        // })
    }

    // TODO separate module?
    fairCopyKeyMap() {
        // "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
        // the function of the enter key is dependent upon the current editor mode
        // need to understand how this presently works and then develop a scheme
        // to interrupt and put the correct node type in there depending on the circumstance
        return baseKeymap
    }

    parseSubDocument(node) {
        const subDoc = PMDOMParser.fromSchema(this.xmlSchema).parse(node)
        const subDocID = `${this.subDocPrefix}${this.subDocCounter++}`
        this.subDocuments[subDocID] = subDoc
        return subDocID
    }

    serializeSubDocument(subDocID) {
        const subDoc = this.subDocuments[subDocID]
        const domSerializer = DOMSerializer.fromSchema( this.xmlSchema )
        const domFragment = domSerializer.serializeFragment(subDoc.content)
        let note = document.createElement('note')
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

    // this should really be happening in the constructor
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

    save(editorView, saveFilePath) {
        // Override save file for testing
        saveFilePath = 'test-docs/je_example_out.xml'

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