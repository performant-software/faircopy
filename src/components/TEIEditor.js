import React, { Component } from 'react';
import {connect} from 'react-redux';

import { DOMParser as PMDOMParser } from "prosemirror-model"
import { AllSelection} from "prosemirror-state"
import {exampleSetup} from "prosemirror-example-setup"
import { keymap } from "prosemirror-keymap"
import { undo, redo } from "prosemirror-history"
import {EditorState, TextSelection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

import { Toolbar, IconButton } from '@material-ui/core'
import {FormatBold, FormatItalic, FormatUnderlined} from '@material-ui/icons';

// import {schema} from "./EditorSchema"
import ProseMirrorComponent from "./ProseMirrorComponent"
import { dispatchAction } from '../redux-store/ReduxStore';

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer

class TEIEditor extends Component {

    componentDidMount() {
        this.setTitle(null)

        // Receive open and save file events from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
        ipcRenderer.on('requestSave', () => this.requestSave())        
        ipcRenderer.on('fileSaved', (event, filePath) => this.save(filePath))        
    }

    createEditorView = (element) => {
        const { teiDocument, editorView } = this.props.teiEditor
        if( editorView ) return;

        const div = document.createElement('DIV')
        div.innerHTML = ""
        const doc = PMDOMParser.fromSchema(teiDocument.xmlSchema).parse(div)
          
        let plugins = exampleSetup({schema: teiDocument.xmlSchema, menuBar: false})
        plugins.push( keymap({"Mod-z": undo, "Mod-y": redo}) )
        const editorInitalState = EditorState.create({ 
            doc, plugins,
            selection: TextSelection.create(doc, 0)
        })
        const nextEditorView = new EditorView( 
            element, 
            { state: editorInitalState }
        )
        dispatchAction( this.props, 'TEIEditorState.setEditorView', nextEditorView )
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
        const { teiDocument, editorView } = this.props.teiEditor
        const editorState = editorView.state
        const docNode = teiDocument.load(filePath)

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
        const { teiDocument, editorView } = this.props.teiEditor
        teiDocument.save( editorView, saveFilePath )
        this.filePath = saveFilePath
        this.setTitle(saveFilePath)
    }

    onBulletList() {
        // TODO
        // const bulletListNodeType = this.state.documentSchema.nodes.bullet_list;
        // const editorState = this.getEditorState();
        // const cmd = wrapInList( bulletListNodeType );
        // cmd( editorState, this.state.editorView.dispatch );
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
        const { teiDocument, editorView } = this.props.teiEditor
        if( !teiDocument ) return null

        return (
            <div>
                { this.renderToolbar() }
                <ProseMirrorComponent
                    editorView={editorView}
                    createEditorView={this.createEditorView}
                />
            </div>
        )
    }
}

function mapStateToProps(state) {
	return {
        teiEditor: state.teiEditor,
    };
}

export default connect(mapStateToProps)(TEIEditor);