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
        this.teiMode = false

        // <ref target="#ref_30470">Great Mutiny</ref><note xml:id="ref_30470">note test</note> 

        const nodes = {
            doc: {
                content: "block+"
            },
            paragraph: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "p"}],
                toDOM() { return ["tei-p", 0] }          
            },
            pb: {
                inline: true,
                group: "inline",
                parseDOM: [{tag: "pb"}],
                toDOM() { return ["tei-pb", ' '] }          
            },
            line: {
                content: "inline*",
                group: "line",
                parseDOM: [{tag: "l"}],
                toDOM() { return ["tei-l", 0] }
            },
            lineGroup: {
                content: "line+",
                group: "block",
                parseDOM: [{tag: "lg"}],
                toDOM: this.lgToDOM
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
                toDOM(node) { 
                    return ["tei-add", 0] 
                }
            },
            del: {
                parseDOM: [
                    {
                        tag: "del"
                    }
                ],
                toDOM(node) { 
                    return ["tei-del", 0] 
                }
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
                toDOM(node) { 
                    let {type} = node.attrs; 
                    return ["tei-name", {type}, 0] 
                }
            },
            note: {
                attrs: {
                    id: {}    
                },
                parseDOM: [
                    {
                        tag: "note",
                        getAttrs(dom) {
                            return {id: dom.getAttribute("xml:id")}
                        }
                    }
                ],
                toDOM(node) { 
                    let {id} = node.attrs; 
                    return ["tei-note", {id}, 0] 
                }
            },            
            ref: {
                parseDOM: [
                    {
                        tag: "ref"
                    } 
                ],
                toDOM(node) { 
                    return ["tei-ref", 0] 
                }
            }
        }

        this.xmlSchema = new Schema({ nodes, marks })
    }

    lgToDOM = () => {
        if( this.teiMode ) {
            return ["lg", 0]
        } else {
            return ["tei-lg", 0]
        }
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
        const xmlDom = parser.parseFromString(text, "text/xml");
        const bodyEl = xmlDom.getElementsByTagName('body')[0]
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
        const domSerializer = DOMSerializer.fromSchema( this.xmlSchema )
        const domFragment = domSerializer.serializeFragment(editorState.doc.content)
        var div = document.createElement('div')
        div.appendChild( domFragment.cloneNode(true) )
        const fileContents = div.innerHTML
        console.log(fileContents) 
        fs.writeFileSync(saveFilePath, fileContents, (err) => {
            if (err) {
                console.log(err)
            } 
        })
        this.teiMode = false
    }

}