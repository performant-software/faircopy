import React, { Component } from 'react';
// import {connect} from 'react-redux';

import { AllSelection} from "prosemirror-state"
import {exampleSetup} from "prosemirror-example-setup"
import { keymap } from "prosemirror-keymap"
import { undo, redo } from "prosemirror-history"
import {EditorState, TextSelection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

import { Toolbar, IconButton } from '@material-ui/core'
import {FormatBold, FormatItalic, FormatUnderlined} from '@material-ui/icons';

import TEIDocumentFile from "../tei-document/TEIDocumentFile"
import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
// import { dispatchAction } from '../redux-store/ReduxStore';

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            filePath: null,
            teiDocumentFile: new TEIDocumentFile(),
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
        const { teiDocumentFile, editorView } = this.state
        if( editorView ) return;

        const doc = teiDocumentFile.blankDocument(document)   
        let plugins = exampleSetup({schema: teiDocumentFile.xmlSchema, menuBar: false})
        plugins.push( keymap({"Mod-z": undo, "Mod-y": redo}) )
        const editorInitalState = EditorState.create({ 
            doc, plugins,
            selection: TextSelection.create(doc, 0)
        })
        const nextEditorView = new EditorView( 
            element, 
            { state: editorInitalState }
        )
        this.setState( { ...this.state, editorView: nextEditorView })
        return nextEditorView
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
        const { teiDocumentFile, editorView } = this.props.teiEditor
        const editorState = editorView.state
        const docNode = teiDocumentFile.load(filePath)

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
        const { teiDocumentFile, editorView } = this.props.teiEditor
        teiDocumentFile.save( editorView, saveFilePath )
        this.filePath = saveFilePath
        this.setTitle(saveFilePath)
    }

    // onBulletList() {
        // TODO
        // const bulletListNodeType = this.state.documentSchema.nodes.bullet_list;
        // const editorState = this.getEditorState();
        // const cmd = wrapInList( bulletListNodeType );
        // cmd( editorState, this.state.editorView.dispatch );
    // }

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
        const { editorView } = this.state

        return (
            <div>
                { this.renderToolbar() }
                <EditorGutter></EditorGutter>
                <ProseMirrorComponent
                    editorView={editorView}
                    createEditorView={this.createEditorView}
                />
            </div>
        )
    }
}

// Don't need Redux yet

// function mapStateToProps(state) {
// 	return {
//         teiEditor: state.teiEditor,
//     };
// }

// export default connect(mapStateToProps)(TEIEditor);