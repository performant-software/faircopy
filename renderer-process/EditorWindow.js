const {EditorState, AllSelection} = require("prosemirror-state")
const {EditorView} = require("prosemirror-view")
const {Schema, DOMParser} = require("prosemirror-model")
const {schema} = require("prosemirror-schema-basic")
const {addListNodes} = require("prosemirror-schema-list")
const {exampleSetup} = require("prosemirror-example-setup")
const {ipcRenderer} = require("electron")
const fs = require('fs')

class EditorWindow {

    constructor() {
        this.documentSchema = new Schema({
            nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
            marks: schema.spec.marks
        })

        const doc = DOMParser.fromSchema(this.documentSchema).parse(document.querySelector("#content"))

        this.editorState = EditorState.create({
            doc,
            plugins: exampleSetup({schema: this.documentSchema})
        })
            
        this.editorView = new EditorView(document.querySelector("#editor"), {
            state: this.editorState
        }) 
        
        // Receive open file event from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
    }

    openFile( filePath ) {
        const text = fs.readFileSync(filePath, "utf8");

        // update the editor with the new document
        const div = document.createElement('DIV')
        div.innerHTML = text
        const docNode = DOMParser.fromSchema(this.documentSchema).parse(div)
        const allSelection = new AllSelection(this.editorState.doc)

        const transaction = this.editorState.tr.setSelection(allSelection)
        transaction.replaceSelectionWith(docNode)
        this.editorState = this.editorState.apply(transaction)
        this.editorView.updateState( this.editorState )
    }
}

exports.EditorWindow = EditorWindow


