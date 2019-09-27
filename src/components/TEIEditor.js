import React, { Component } from 'react';
// import {connect} from 'react-redux';

import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"

import { Toolbar, Button } from '@material-ui/core'

import TEIDocumentFile from "../tei-document/TEIDocumentFile"
import { addMark } from "../tei-document/commands"

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer';
// import { dispatchAction } from '../redux-store/ReduxStore';

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            filePath: null,
            noteID: null,
            teiDocumentFile: new TEIDocumentFile(),
            editorView: null,
            editorState: null
        }	
    }

    componentDidMount() {
        this.setTitle(null)

        // Receive open and save file events from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
        ipcRenderer.on('requestSave', () => this.requestSave())        
        ipcRenderer.on('fileSaved', (event, filePath) => this.save(filePath))      
        ipcRenderer.on('noteOpened', (event, noteID) => this.openNote(noteID))

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
                state: editorInitalState,
                handleClickOn: this.handleClickOn
            }
        )

        this.setState( { ...this.state, editorView: nextEditorView, editorState: editorInitalState })
        return nextEditorView
    }

    dispatchTransaction = (transaction) => {
        const { editorView, editorState } = this.state 
        if( editorView ) {
            const nextEditorState = editorState.apply(transaction)
            editorView.updateState(nextEditorState)
            this.setState({...this.state, editorState: nextEditorState })    
            // console.log(JSON.stringify(nextEditorState.toJSON()))
        }
    }

    handleClickOn = (view,pos,node,nodePos,event,direct) => {
        if( direct && node.type.name === 'note' ) {
            const {subDocID} = node.attrs
            const subDoc = this.state.teiDocumentFile.subDocuments[subDocID]
            localStorage.setItem(subDocID, JSON.stringify(subDoc.toJSON()));
            ipcRenderer.send( 'createNoteEditorWindow', subDocID )
        }

        // TODO resolve ref links here too
    }

    setTitle( filePath ) {
        let title
        if( filePath ) {
            const filename = filePath.replace(/^.*[\\/]/, '')
            title = `${filename}`    
        } else {
            title = "Untitled Document"
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

    openNote( noteID ) {
        const { teiDocumentFile, editorView } = this.state
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const doc = teiDocumentFile.xmlSchema.nodeFromJSON(noteJSON);
        const newEditorState = EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: teiDocumentFile.pluginSetup()
        })
        if( newEditorState ) {
            editorView.updateState( newEditorState )        
            this.setTitle(`Note ${noteID}`)
            this.setState( { ...this.state, editorState: newEditorState, noteID })    
        } else {
            console.log(`Unable to load note: ${noteID}`)
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
        const { teiDocumentFile, editorView } = this.state
        teiDocumentFile.save( editorView, saveFilePath )
        this.setState( { ...this.state, filePath: saveFilePath })
        this.setTitle(saveFilePath)
    }

    onRef = () => {
        const {editorState, teiDocumentFile, editorView} = this.state 
        const markType = teiDocumentFile.xmlSchema.marks.ref
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    onDel = () => {
        const {editorState, teiDocumentFile, editorView} = this.state 
        const markType = teiDocumentFile.xmlSchema.marks.del
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    renderToolbar() {
        return (
            <Toolbar style={{ background: '#FAFAFA', minHeight: '55px' }}>
                <Button onClick={this.onRef} variant='text' tooltip='Add Ref Element'>ref</Button>
                <Button onClick={this.onDel} variant='text' tooltip='Add Del Element'>del</Button>
            </Toolbar>
        )
    }

    render() {    
        const { editorView, editorState } = this.state
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
                <ParameterDrawer editorState={editorState} dispatch={this.dispatchTransaction}></ParameterDrawer>
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