import {Schema, DOMParser as PMDOMParser } from "prosemirror-model"
import { SimpleSchema } from './SimpleSchema';
import {exampleSetup} from "prosemirror-example-setup"
import { keymap } from "prosemirror-keymap"
import { undo, redo } from "prosemirror-history"
import {EditorState, TextSelection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

const fs = window.nodeAppDependencies.fs

export default class TEIDocument {

    constructor() {

        /* <lg type="stanza">
                <l>Piping down the valleys wild, </l>
                <l>Piping songs of pleasant glee, </l>
                <l>On a cloud I saw a child, </l>
                <l>And he laughing said to me: </l>
            </lg> */

        const nodes = {
            doc: {
                content: "block+"
            },
            text: {
                group: "inline"
            },
            lineGroup: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "lg"}],
                toDOM() { return ["lg", 0] }
            },
            line: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "l"}],
                toDOM() { return ["l", 0] }
            },
        }

        const marks = {}

        this.xmlSchema = new Schema({ nodes, marks })
    }

    createView(element) {
        const documentSchema = SimpleSchema
        
        // const documentSchema = new Schema({
        //     nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
        //     marks: schema.spec.marks
        // })

        const div = document.createElement('DIV')
        div.innerHTML = ""
        const doc = PMDOMParser.fromSchema(documentSchema).parse(div)
          
        let plugins = exampleSetup({schema: documentSchema, menuBar: false})
        plugins.push( keymap({"Mod-z": undo, "Mod-y": redo}) )
        const editorInitalState = EditorState.create({ 
            doc, plugins,
            selection: TextSelection.create(doc, 0)
        })
        const editorView = new EditorView( 
            element, 
            { state: editorInitalState }
        )
        return editorView
    }

    // this should really be happening in the constructor
    load( filePath ) {
        const text = fs.readFileSync(filePath, "utf8")
        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(text, "text/xml");
        const xmlDoc = PMDOMParser.fromSchema(this.xmlSchema).parse(xmlDom)

        // TODO Convert from XML Schema to Simple Schema
        


        // in memory, there are three objects:
        // xml prosemirror doc
        // editor view (which holds editor state)
        // db of all element attribute data
        
        // changing element attribute data does 
        // not mutate the docs, just stored in db state
        // db state managed by redux?
        
        // redux keeps a list of open editors
        // editors do not share state unless
        // they are being mutually edited

        // this module should really be the TEI document

        // for every element, must define how to go 
        // from xml to html and back

        // xml and html have exact same char streams
        // with element structures that can be
        // crosswalked all html have id of the 
        // corresponding xml
        // all attrib data is stored in db and 
        // shared by both

        // seperate module for parsing ODD file
        // configures the editor to provide
        // the tags supported by the schema
        // also embeds the technical documentation
        // in the correct language

        return null;
    }

}