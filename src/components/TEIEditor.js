import React, { Component } from 'react';
// import {connect} from 'react-redux';

import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"

import { Toolbar, Button, IconButton } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import SaveIcon from '@material-ui/icons/Save';
import CloseIcon from '@material-ui/icons/Close';

import TEIDocument from "../tei-document/TEIDocument"
import { addMark } from "../tei-document/commands"

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import ThumbnailMargin from './ThumbnailMargin'
// import { dispatchAction } from '../redux-store/ReduxStore'

const {ipcRenderer} = window.nodeAppDependencies.ipcRenderer
const clippy = window.nodeAppDependencies.clipboard

const untitledDocumentTitle = "Untitled Document"
const versionNumber = "0.3.2"
const dialogPlaneThreshold = 200

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            filePath: null,
            noteID: null,
            teiDocument: new TEIDocument(),
            editorView: null,
            editorState: null,
            changedSinceLastSave: false,
            alertDialogMode: false
        }	
    }

    componentDidMount() {
        this.setTitle(null)

        // Receive open and save file events from the main process
        ipcRenderer.on('fileOpened', (event, filePath) => this.openFile(filePath))
        ipcRenderer.on('requestSave', () => this.requestSave())        
        ipcRenderer.on('fileSaved', (event, filePath) => this.save(filePath))      
        ipcRenderer.on('noteOpened', (event, noteID) => this.openNote(noteID))
        ipcRenderer.on('fileNew', (event) => this.newFile() )

        window.addEventListener("resize", this.onWindowResize)
        window.onbeforeunload = this.onBeforeUnload
    }

    onBeforeUnload = (e) => {
        const { exitAnyway, changedSinceLastSave } = this.state
        
        // TODO isNoteWindow

        if( !exitAnyway && changedSinceLastSave ) {
            this.setState({ ...this.state, alertDialogMode: 'close'})
            e.returnValue = false
        } 
    }

    onWindowResize = () => {
        // dispatch a blank transaction to force a display update of the subcomponents
        if( this.state.editorState ) {
            const tr = this.state.editorState.tr
            this.dispatchTransaction(tr)    
        }
    }

    createEditorView = (element) => {
        const { teiDocument, editorView } = this.state
        if( editorView ) return;

        const editorInitalState = teiDocument.editorInitialState(document) 
        const nextEditorView = new EditorView( 
            element,    
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: editorInitalState,
                handleClickOn: this.handleClickOn,
                domParser: teiDocument.domParser,
                clipboardTextSerializer: teiDocument.clipboardTextSerializer,
            }
        )
        nextEditorView.focus()
        this.setState( { ...this.state, editorView: nextEditorView, editorState: editorInitalState })
        return nextEditorView
    }

    dispatchTransaction = (transaction) => {
        const { editorView, editorState, changedSinceLastSave } = this.state 
        if( editorView ) {
            const nextEditorState = editorState.apply(transaction)
            editorView.updateState(nextEditorState)
            const docChanged = changedSinceLastSave || transaction.docChanged
            this.setState({...this.state, changedSinceLastSave: docChanged, editorState: nextEditorState })    
        }
    }

    handleClickOn = (view,pos,node,nodePos,event,direct) => {
        const nodeType = node.type.name
        if( !direct ) return;

        if( nodeType === 'note' ) {
            const {id} = node.attrs
            ipcRenderer.send( 'createNoteEditorWindow', id )
        }
        else if( event.ctrlKey) { 
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
                    // TODO support URL targets
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
            title = untitledDocumentTitle
        }
        var titleEl = document.getElementsByTagName("TITLE")[0]
        titleEl.innerHTML = title
    }

    newFile() {
        const { teiDocument, editorView, changedSinceLastSave, exitAnyway } = this.state

        if( !exitAnyway && changedSinceLastSave ) {
            this.setState({ ...this.state, changedSinceLastSave: false, alertDialogMode: 'new'})
        } else {
            const newEditorState = teiDocument.editorInitialState(document)
            editorView.updateState( newEditorState )        
            this.setTitle(untitledDocumentTitle)
            editorView.focus();
            this.setState( { 
                ...this.state, 
                exitAnyway: false, 
                alertDialogMode: false, 
                changedSinceLastSave: false,
                editorState: newEditorState, 
                filePath: null 
            })    
        }
    }

    openFile( filePath ) {
        const { teiDocument, editorView } = this.state
        const newEditorState = teiDocument.load(filePath)
        if( newEditorState ) {
            editorView.updateState( newEditorState )        
            this.setTitle(filePath)
            editorView.focus();
            this.setState( { ...this.state, editorState: newEditorState, changedSinceLastSave: false, filePath })    
        } else {
            console.log(`Unable to load file: ${filePath}`)
        }
    }

    openNote( noteID ) {
        const { teiDocument, editorView } = this.state
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const doc = teiDocument.xmlSchema.nodeFromJSON(noteJSON);
        const newEditorState = EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: teiDocument.plugins
        })
        if( newEditorState ) {
            editorView.updateState( newEditorState )        
            this.setTitle(`Note ${noteID}`)
            editorView.focus();
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
        const { teiDocument, editorView } = this.state
        teiDocument.save( editorView, saveFilePath )
        this.setState( { ...this.state, 
            filePath: saveFilePath, 
            alertDialogMode: false, 
            changedSinceLastSave: false, 
            exitAnyway: false
        })

        this.setTitle(saveFilePath)
    }

    onClippy = () => {
        const html = clippy.readHTML()
        console.log( `clippy: ${html}`) 
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
        const {editorState, teiDocument, editorView} = this.state 
        const markType = teiDocument.xmlSchema.marks.ref
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    onHi = () => {
        const {editorState, teiDocument, editorView} = this.state 
        const markType = teiDocument.xmlSchema.marks.hi
        const cmd = addMark( markType );
        cmd( editorState, editorView.dispatch );    
    }

    onName = () => {
        const {editorState, teiDocument, editorView} = this.state 
        const markType = teiDocument.xmlSchema.marks.name
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
        const { editorState, teiDocument } = this.state
        const { $anchor } = editorState.selection
        const { tr } = editorState
        const subDocID = teiDocument.createSubDocument(document)
        const noteNode = editorState.schema.node('note', { id: subDocID })
        tr.insert($anchor.pos, noteNode) 
        this.dispatchTransaction(tr)
        ipcRenderer.send( 'createNoteEditorWindow', subDocID )
    }

    isNoteWindow() {
        const { noteID } = this.state
        return ( noteID !== null && noteID !== undefined ) 
    }

    renderSaveButton() {
        if( this.isNoteWindow() ) {
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
        const isNoteWindow = this.isNoteWindow()
        return (
            <div className="toolbar">
                { this.renderSaveButton() }
                { isNoteWindow ? "" : <span style={ {float: 'right', 'marginTop': '15px'} }>{`DEV RELEASE v${versionNumber}`}</span> }
                <Toolbar className="draggable" style={{ background: '#FAFAFA', minHeight: '55px' }}>
                    <Button onClick={this.onHi}  tooltip='Add Hi Element'>hi</Button>
                    <Button onClick={this.onRef} tooltip='Add Ref Element'>ref</Button>
                    <Button onClick={this.onNote} tooltip='Add Note Element'>note</Button>
                    { isNoteWindow ? "" : <Button onClick={this.onPb}  tooltip='Add Pb Element'>pb</Button> }       
                    <Button onClick={this.onName} tooltip='Add Name Element'>name</Button>
                    <Button onClick={this.onClippy} >clippy</Button>
                    <Button onClick={this.onErase} tooltip='Erase Element'><span className="fa fa-eraser"></span></Button>
                </Toolbar>
            </div>
        )
    }

    renderAlertDialog() {      
        const {alertDialogMode} = this.state
        
        const handleSave = () => {
            this.requestSave()
        }

        const handleClose = () => {
            this.setState({...this.state, exitAnyway: true });
            alertDialogMode === 'close' ? window.close() : this.newFile()
        }
        
        let message
        if( alertDialogMode === 'close' ) {
            message = "Do you wish to save this file before exiting?"
        } else if( alertDialogMode === 'new' ) {
            message = "Do you wish to save this file before creating a new document?"
        }

        return (
            <Dialog
                open={alertDialogMode !== false}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Unsaved changes"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        { message }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSave} color="primary" autoFocus>
                    Save
                    </Button>
                    <Button onClick={handleClose} color="primary">
                    Don't Save
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    dialogPlaneClass() {
        const { editorView, editorState } = this.state

        // Control based on Y position of selection anchor
        const selection = (editorState) ? editorState.selection : null 
        if( selection ) {
            const { $anchor } = selection
            const selectionRect = editorView.coordsAtPos($anchor.pos)
            if( selectionRect.top < dialogPlaneThreshold ) return 'dialogPlaneBottom'    
        }
        return 'dialogPlaneTop'   
    }

    render() {    
        const { editorView, editorState, teiDocument } = this.state
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
                    <ThumbnailMargin scrollTop={scrollTop} editorView={editorView}></ThumbnailMargin>
                </div>
                <div className={this.dialogPlaneClass()}>
                    <ParameterDrawer 
                        teiDocument={teiDocument} 
                        editorState={editorState} 
                        dispatch={this.dispatchTransaction}
                    ></ParameterDrawer>
                </div> 
                { this.renderAlertDialog() }
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