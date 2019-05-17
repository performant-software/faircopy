import React, { Component } from 'react';

import {EditorState, TextSelection, AllSelection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {Schema, DOMParser, DOMSerializer} from "prosemirror-model"
import { keymap } from "prosemirror-keymap"
import { undo, redo } from "prosemirror-history"
import {addListNodes} from "prosemirror-schema-list"
import {exampleSetup} from "prosemirror-example-setup"

import { Toolbar, IconButton } from '@material-ui/core'
import {FormatBold, FormatItalic, FormatUnderlined} from '@material-ui/icons';

import {schema} from "./EditorSchema"
import ProseMirrorComponent from "./ProseMirrorComponent"

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer
const fs = window.nodeAppDependencies.fs

class EditorWindow extends Component {

    constructor() {
        super()

        this.state = {
            filePath: null,
            editorView: null
        }
    }

    componentDidMount() {
        this.setTitle(null)

        // Receive open and save file events from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
        ipcRenderer.on('requestSave', () => this.requestSave())        
        ipcRenderer.on('fileSaved', (event, filePath) => this.save(filePath))        
    }

    createEditorView = (element) => {

        if( this.state.editorView ) return;
        
        const documentSchema = new Schema({
            nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
            marks: schema.spec.marks
        })

        const div = document.createElement('DIV')
        div.innerHTML = ""
        const doc = DOMParser.fromSchema(documentSchema).parse(div)
          
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
        this.setState({ ...this.state, editorView, documentSchema })
    }

    setTitle( filePath ) {
        let title
        if( filePath ) {
            const filename = filePath.replace(/^.*[\\/]/, '')
            title = `${filename} - Faircopy`    
        } else {
            title = "Untitled Document - Faircopy"
        }
        var titleEl = document.getElementsByTagName("TITLE")[0]
        titleEl.innerHTML = title
    }

    openFile( filePath ) {
        const { documentSchema, editorView } = this.state
        const editorState = editorView.state
        
        const text = fs.readFileSync(filePath, "utf8")
        const div = document.createElement('DIV')
        div.innerHTML = text
        const docNode = DOMParser.fromSchema(documentSchema).parse(div)
        const allSelection = new AllSelection(editorState.doc)

        const transaction = editorState.tr.setSelection(allSelection).replaceSelectionWith(docNode)
        editorView.updateState( editorState.apply(transaction) )
        
        this.setTitle(filePath)
        this.setState( { ...this.state, filePath })
    }

    requestSave() {
        const { filePath } = this.state
        if( filePath === null ) {
            ipcRenderer.send( 'openSaveFileDialog' )
        } else {
            this.save(filePath)
        }
    }

    save(saveFilePath) {
        const { documentSchema, editorView } = this.state
        const editorState = editorView.state

        const domSerializer = DOMSerializer.fromSchema( documentSchema )
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
        this.filePath = saveFilePath
        this.setTitle(saveFilePath)
    }

    renderToolbar() {
        return (
            <Toolbar style={{ background: '#FAFAFA', minHeight: '55px' }}>
                <IconButton tooltip='Bold selected text.'>
                    <FormatBold />
                </IconButton>
                <IconButton tooltip='Italicize selected text.'>
                    <FormatItalic />
                </IconButton>
                <IconButton tooltip='Underline selected text.'>
                    <FormatUnderlined />
                </IconButton>
            </Toolbar>
        )
    }

    render() {      
        return (
            <div>
                { this.renderToolbar() }
                <ProseMirrorComponent
                    editorView={this.state.editorView}
                    createEditorView={this.createEditorView}
                />
            </div>
        )
    }
}

export default EditorWindow