import React, { Component } from 'react';
// import {connect} from 'react-redux';

import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"

import { Toolbar, Button, IconButton } from '@material-ui/core'
import SaveIcon from '@material-ui/icons/Save';
import CloseIcon from '@material-ui/icons/Close';

import TEIDocument from "../tei-document/TEIDocument"
import { addMark } from "../tei-document/commands"

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import ThumbnailMargin from './ThumbnailMargin'
// import { dispatchAction } from '../redux-store/ReduxStore';

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            filePath: null,
            noteID: null,
            teiDocumentFile: new TEIDocument(),
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
        const nodeType = node.type.name
        if( !direct ) return;

        if( nodeType === 'note' ) {
            const {id} = node.attrs
            ipcRenderer.send( 'createNoteEditorWindow', id )
        }
        else { 
            const { doc } = this.state.editorState
            const $pos = doc.resolve(pos)
            const marks = $pos.marks()
            for( let mark of marks ) {
                if( mark.type.name === 'ref' ) {
                    const {target} = mark.attrs
                    if( target && target[0] === '#') {
                        ipcRenderer.send( 'createNoteEditorWindow', target.slice(1) )
                        return
                    }        
                }
            }
        }
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

    saveAndCloseNote = () => {
        const { noteID } = this.state
        const { doc } = this.state.editorState

        if( noteID ) {
            localStorage.setItem(noteID, JSON.stringify(doc.toJSON()));
            ipcRenderer.send( 'closeNoteWindow', noteID )
        }
    }

    requestSave = () => {
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

    onErase = () => {
        const { editorState } = this.state
        const { tr } = editorState
        let {empty, $cursor, ranges} = editorState.selection
        if (empty || $cursor) return
        for (let i = 0; i < ranges.length; i++) {
            let {$from, $to} = ranges[i]
            tr.removeMark($from.pos, $to.pos)
        }
        this.dispatchTransaction(tr)
    }

    onRef = () => {
        const {editorState, teiDocumentFile, editorView} = this.state 
        const markType = teiDocumentFile.xmlSchema.marks.ref
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    onHi = () => {
        const {editorState, teiDocumentFile, editorView} = this.state 
        const markType = teiDocumentFile.xmlSchema.marks.hi
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    onName = () => {
        const {editorState, teiDocumentFile, editorView} = this.state 
        const markType = teiDocumentFile.xmlSchema.marks.name
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    onPb = () => {
        const { editorState } = this.state
        const { $anchor } = editorState.selection
        const { tr } = editorState
        const pbNode = editorState.schema.node('pb')
        tr.insert($anchor.pos, pbNode) 
        this.dispatchTransaction(tr)
    }

    onNote = () => {
        const { editorState, teiDocumentFile } = this.state
        const { $anchor } = editorState.selection
        const { tr } = editorState
        const subDocID = teiDocumentFile.createSubDocument(document)
        const noteNode = editorState.schema.node('note', { id: subDocID })
        tr.insert($anchor.pos, noteNode) 
        this.dispatchTransaction(tr)
        ipcRenderer.send( 'createNoteEditorWindow', subDocID )
    }

    renderSaveButton() {
        const { noteID } = this.state

        if( noteID ) {
            return (
               <IconButton 
                   className='save-button' 
                   onClick={this.saveAndCloseNote} 
                   variant='text' 
                   tooltip='Close note'>
                       <CloseIcon />
               </IconButton>
            )
       } else {
           return (
               <IconButton 
                   className='save-button' 
                   onClick={this.requestSave} 
                   variant='text' 
                   tooltip='Save document'>
                       <SaveIcon />
               </IconButton>
            )
       }
    }

    renderToolbar() {
        return (
            <div>
                { this.renderSaveButton() }
                <Toolbar className="draggable" style={{ background: '#FAFAFA', minHeight: '55px' }}>
                    <Button onClick={this.onHi}  tooltip='Add Hi Element'>hi</Button>
                    <Button onClick={this.onRef} tooltip='Add Ref Element'>ref</Button>
                    <Button onClick={this.onNote} tooltip='Add Note Element'>note</Button>
                    <Button onClick={this.onPb}  tooltip='Add Pb Element'>pb</Button>
                    <Button onClick={this.onName} tooltip='Add Name Element'>name</Button>
                    <Button onClick={this.onErase} tooltip='Erase Element'><span className="fa fa-eraser"></span></Button>
                </Toolbar>
            </div>
        )
    }

    render() {    
        const { editorView, editorState, teiDocumentFile } = this.state
        const baseURL = "http://localhost:3000"
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
                    <ThumbnailMargin scrollTop={scrollTop} baseURL={baseURL} editorView={editorView}></ThumbnailMargin>
                </div>    
                <ParameterDrawer 
                    teiDocumentFile={teiDocumentFile} 
                    editorState={editorState} 
                    dispatch={this.dispatchTransaction}
                ></ParameterDrawer>
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