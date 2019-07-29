import React, { Component } from 'react';
// import {connect} from 'react-redux';

import {EditorView} from "prosemirror-view"

import { Toolbar, Button } from '@material-ui/core'

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
            editorView: null,
            editorState: null,
            editMode: 'P'
        }	
    }

    componentDidMount() {
        this.setTitle(null)

        // Receive open and save file events from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
        ipcRenderer.on('requestSave', () => this.requestSave())        
        ipcRenderer.on('fileSaved', (event, filePath) => this.save(filePath))      
        
        window.addEventListener("resize", this.onWindowResize)
    }

    onWindowResize = () => {
        // dispatch a blank transaction to force a display update of the subcomponents
        const tr = this.state.editorState.tr
        this.dispatchTransaction(tr)
    }

    createEditorView = (element) => {
        const { teiDocumentFile, editorView } = this.state
        if( editorView ) return;

        const editorInitalState = teiDocumentFile.editorInitialState(document) 
        const nextEditorView = new EditorView( 
            element,    
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: editorInitalState
            }
        )

        this.setState( { ...this.state, editorView: nextEditorView, editorState: editorInitalState })
        return nextEditorView
    }

    dispatchTransaction = (transaction) => {
        const { editorView } = this.state 
        const editorState = editorView.state
        const nextEditorState = editorState.apply(transaction)
        editorView.updateState(nextEditorState)
        this.setState({...this.state, editorState: nextEditorState })
        // console.log(JSON.stringify(nextEditorState.toJSON()))
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
        const { teiDocumentFile, editorView } = this.state
        const newEditorState = teiDocumentFile.load(filePath)
        if( newEditorState ) {
            editorView.updateState( newEditorState )        
            this.setTitle(filePath)
            this.setState( { ...this.state, editorState: newEditorState, filePath })    
        } else {
            console.log(`Unable to load file: ${filePath}`)
        }
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

    onProseMode = () => {
        this.setState({ ...this.state, editMode: 'P'})
    }

    onVerseMode = () => {
        this.setState({ ...this.state, editMode: 'V'})
    }

    onDramaMode = () => {
        this.setState({ ...this.state, editMode: 'D'})        
    }

    renderToolbar() {
        const {editMode} = this.state
        const pVariant = editMode === 'P' ? 'contained' : 'text'
        const vVariant = editMode === 'V' ? 'contained' : 'text'
        const dVariant = editMode === 'D' ? 'contained' : 'text'
        return (
            <Toolbar style={{ background: '#FAFAFA', minHeight: '55px' }}>
                <Button onClick={this.onProseMode} variant={pVariant} tooltip='Prose Mode'>P</Button>
                <Button disabled onClick={this.onVerseMode} variant={vVariant} tooltip='Verse Mode'>V</Button>
                <Button disabled onClick={this.onDramaMode} variant={dVariant} ooltip='Drama Mode'>D</Button>
            </Toolbar>
        )
    }

    render() {    
        const { editorView } = this.state
        const scrollTop = this.el ? this.el.scrollTop : 0

        return (
            <div className='TEIEditor'> 
                <div className='header'>
                    { this.renderToolbar() }
                </div>
                <div ref={(el) => this.el = el } className='body'>
                    <EditorGutter scrollTop={scrollTop} editorView={editorView}></EditorGutter>
                    <ProseMirrorComponent
                        editorView={editorView}
                        createEditorView={this.createEditorView}
                    />
                </div>    
                {/* <div className='status-bar'>
                    <p>Current Mode:</p>
                </div> */}
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