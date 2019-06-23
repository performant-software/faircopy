import {Schema, DOMParser as PMDOMParser } from "prosemirror-model"
import {DOMSerializer} from "prosemirror-model"

const fs = window.nodeAppDependencies.fs

export default class TEIDocument {

    constructor() {

        /* <lg type="stanza">
                <l>Piping down the valleys wild, </l>
                <l>Piping songs of pleasant glee, </l>
                <l>On a cloud I saw a child, </l>
                <l>And he laughing said to me: </l>
            </lg> */

        this.teiMode = false

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
                toDOM: this.lgToDOM
            },
            line: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "l"}],
                toDOM() { return ["li", 0] }
            },
        }

        const marks = {}

        this.xmlSchema = new Schema({ nodes, marks })
    }

    lgToDOM = () => {
        if( this.teiMode ) {
            return ["lg", 0]
        } else {
            return ["ul", 0]
        }
    }

    // this should really be happening in the constructor
    load( filePath ) {
        const text = fs.readFileSync(filePath, "utf8")
        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(text, "text/xml");
        const xmlDoc = PMDOMParser.fromSchema(this.xmlSchema).parse(xmlDom)
        return xmlDoc
        
        // TODO db of attributes managed by this object

        // for every element, define serializer for HTML and XML

        // seperate module for parsing ODD file
        // configures the editor to provide
        // the tags supported by the schema
        // also embeds the technical documentation
        // in the correct language
    }

    save(editorView, saveFilePath) {
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
    }

}