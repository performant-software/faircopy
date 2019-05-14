const {EditorState, AllSelection} = require("prosemirror-state")
const {EditorView} = require("prosemirror-view")
const {Schema, DOMParser, DOMSerializer} = require("prosemirror-model")
const { keymap } = require("prosemirror-keymap")
const { undo, redo } = require("prosemirror-history")
const {addListNodes} = require("prosemirror-schema-list")
const {exampleSetup} = require("prosemirror-example-setup")

const {ipcRenderer} = require("electron")
const fs = require('fs')

const {schema} = require("./EditorSchema")

class EditorWindow {

    constructor() {

        this.filePath = null
        this.setTitle(null)

        this.documentSchema = new Schema({
            nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
            marks: schema.spec.marks
        })

        const div = document.createElement('DIV')
        div.innerHTML = ""
        const doc = DOMParser.fromSchema(this.documentSchema).parse(div)
          
        let plugins = exampleSetup({schema: this.documentSchema, menuBar: false})
        plugins.push( keymap({"Mod-z": undo, "Mod-y": redo}) )
        const startState = EditorState.create({ doc, plugins })

        this.editorView = new EditorView(document.querySelector("#editor"), {
            state: startState
        }) 

        // Receive open and save file events from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
        ipcRenderer.on('requestSave', (event, filePath) => this.requestSave())        
        ipcRenderer.on('fileSaved', (event, filePath) => this.save(filePath))        
    }

    setTitle( filePath ) {
        let title
        if( filePath ) {
            const filename = filePath.replace(/^.*[\\\/]/, '')
            title = `${filename} - Faircopy`    
        } else {
            title = "Untitled Document - Faircopy"
        }
        var titleEl = document.getElementsByTagName("TITLE")[0]
        titleEl.innerHTML = title
    }

    openFile( filePath ) {
        const state = this.editorView.state
        const text = fs.readFileSync(filePath, "utf8")

        const div = document.createElement('DIV')
        div.innerHTML = text
        const docNode = DOMParser.fromSchema(this.documentSchema).parse(div)
        const allSelection = new AllSelection(state.doc)

        const transaction = state.tr.setSelection(allSelection).replaceSelectionWith(docNode)
        this.editorView.updateState( state.apply(transaction) )
        
        this.filePath = filePath
        this.setTitle(filePath)
    }

    requestSave() {
        if( this.filePath === null ) {
            ipcRenderer.send( 'openSaveFileDialog' )
        } else {
            this.save(this.filePath)
        }
    }

    save(saveFilePath) {
        const state = this.editorView.state
        const domSerializer = DOMSerializer.fromSchema( this.documentSchema )
        const domFragment = domSerializer.serializeFragment(state.doc.content)
        var div = document.createElement('div')
        div.appendChild( domFragment.cloneNode(true) )
        const fileContents = div.innerHTML
        console.log(fileContents) 
        fs.writeFileSync(saveFilePath, fileContents, (err) => {
            if (err) {
                console.log(err)
            } 
        })
        this.filePath = saveFilePath
        this.setTitle(saveFilePath)
    }
}

exports.EditorWindow = EditorWindow


