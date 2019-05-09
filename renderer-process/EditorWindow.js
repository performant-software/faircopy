var {EditorState} = require("prosemirror-state")
var {EditorView} = require("prosemirror-view")
var {Schema, DOMParser} = require("prosemirror-model")
var {schema} = require("prosemirror-schema-basic")
var {addListNodes} = require("prosemirror-schema-list")
var {exampleSetup} = require("prosemirror-example-setup")
var {ipcRenderer} = require("electron")

class EditorWindow {

    constructor() {
        const mySchema = new Schema({
            nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
            marks: schema.spec.marks
        })
            
        this.editorView = new EditorView(document.querySelector("#editor"), {
            state: EditorState.create({
                doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content")),
                plugins: exampleSetup({schema: mySchema})
            })
        }) 
        
        ipcRenderer.on('fileOpened', (event, filePath) => {
            this.openFile(filePath) 
        })
    }

    openFile( filePath ) {
        // update the editor with the new document
        
    }
}

exports.EditorWindow = EditorWindow


