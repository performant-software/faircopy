// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var {EditorState} = require("prosemirror-state")
var {EditorView} = require("prosemirror-view")
var {Schema, DOMParser} = require("prosemirror-model")
var {schema} = require("prosemirror-schema-basic")
var {addListNodes} = require("prosemirror-schema-list")
var {exampleSetup} = require("prosemirror-example-setup")


// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks
})

window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(mySchema).parse(document.querySelector("#content")),
    plugins: exampleSetup({schema: mySchema})
  })
})

