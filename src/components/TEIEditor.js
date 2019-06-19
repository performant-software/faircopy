import React, { Component } from 'react';
import {connect} from 'react-redux';

import { AllSelection} from "prosemirror-state"
import {DOMParser, DOMSerializer} from "prosemirror-model"
// import {addListNodes} from "prosemirror-schema-list"

import { Toolbar, IconButton } from '@material-ui/core'
import {FormatBold, FormatItalic, FormatUnderlined} from '@material-ui/icons';

// import {schema} from "./EditorSchema"
import ProseMirrorComponent from "./ProseMirrorComponent"
import TEIDocument from '../tei-document/TEIDocument';
import { dispatchAction } from '../redux-store/ReduxStore';

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer
const fs = window.nodeAppDependencies.fs

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
        const nextEditorView = teiDocument.createView(element)
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
        // const { documentSchema, editorView } = this.state
        // const editorState = editorView.state

        const teiParser = new TEIDocument()
        teiParser.load(filePath)

        // const text = fs.readFileSync(filePath, "utf8")
        // const div = document.createElement('DIV')
        // div.innerHTML = text
        // const docNode = DOMParser.fromSchema(documentSchema).parse(div)

        // const allSelection = new AllSelection(editorState.doc)
        // const transaction = editorState.tr.setSelection(allSelection).replaceSelectionWith(docNode)
        // editorView.updateState( editorState.apply(transaction) )
        
        this.setTitle(filePath)
        // this.setState( { ...this.state, filePath })
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