import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core'
import SplitPane from 'react-split-pane'
import { debounce } from "debounce";

import TEIDocument from "../tei-document/TEIDocument"

import TableOfContents from './TableOfContents'
import TEIEditor from './TEIEditor'

const fairCopy = window.fairCopy

const untitledDocumentTitle = "Untitled Document"
const resizeRefreshRate = 100

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            filePath: null,
            teiDocument: new TEIDocument(this.onStateChange),
            editorState: null,
            alertDialogMode: false
        }	
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,editorState:nextState})
    }

    componentDidMount() {
        const {teiDocument} = this.state
        const {services} = fairCopy
        this.setTitle(null)

        // Receive open and save file events from the main process
        services.ipcRegisterCallback('fileOpened', (event, filePath) => this.openFile(filePath))
        services.ipcRegisterCallback('requestSave', () => this.requestSave())        
        services.ipcRegisterCallback('fileSaved', (event, filePath) => this.save(filePath))      
        services.ipcRegisterCallback('fileNew', (event) => this.newFile() )
        services.ipcRegisterCallback('openPrint', (event) => this.openPrint() )
        services.initConfigClient()

        window.addEventListener("resize", debounce(teiDocument.refreshView,resizeRefreshRate))

        window.onbeforeunload = this.onBeforeUnload
    }

    onBeforeUnload = (e) => {
        const { exitAnyway, teiDocument } = this.state
        const { changedSinceLastSave } = teiDocument

        if( !exitAnyway && changedSinceLastSave ) {
            this.setState({ ...this.state, alertDialogMode: 'close'})
            e.returnValue = false
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

    openPrint() {
        window.print()
    }

    newFile() {
        const { teiDocument, exitAnyway } = this.state
        const { changedSinceLastSave } = teiDocument

        if( !exitAnyway && changedSinceLastSave ) {
            this.setState({ ...this.state, alertDialogMode: 'new'})
            teiDocument.changedSinceLastSave = false 
        } else {
            const { editorView } = teiDocument
            const newEditorState = teiDocument.editorInitialState(document)
            editorView.updateState( newEditorState )       
            teiDocument.changedSinceLastSave = false 
            this.setTitle(untitledDocumentTitle)
            editorView.focus();
            this.setState( { 
                ...this.state, 
                exitAnyway: false, 
                alertDialogMode: false, 
                filePath: null 
            })    
        }
    }

    openFile( filePath ) {
        const { teiDocument } = this.state
        const newEditorState = teiDocument.load(filePath)
        if( newEditorState ) {
            const {editorView} = teiDocument
            editorView.updateState( newEditorState )        
            this.setTitle(filePath)
            editorView.focus();
            this.setState( { ...this.state, filePath })    
        } else {
            console.log(`Unable to load file: ${filePath}`)
        }
    }

    requestSave = () => {
        const { filePath } = this.state
        if( filePath === null ) {
            fairCopy.services.ipcSend( 'openSaveFileDialog' )
        } else {
            this.save(filePath)
        }
    }

    save(saveFilePath) {
        const { teiDocument } = this.state
        teiDocument.save( saveFilePath )
        this.setState( { ...this.state, 
            filePath: saveFilePath, 
            alertDialogMode: false, 
            exitAnyway: false
        })

        this.setTitle(saveFilePath)
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

    render() {
        const { teiDocument, editorState } = this.state
        const onChange = debounce(teiDocument.refreshView,resizeRefreshRate)

        return (
            <div> 
                <SplitPane split="vertical" minSize={0} defaultSize={0} onChange={onChange}>
                  <TableOfContents
                    editorState={editorState}
                    teiDocument={teiDocument}                  
                  ></TableOfContents>
                  <TEIEditor 
                    editorState={editorState}
                    teiDocument={teiDocument}
                    onSave={this.requestSave}  
                  ></TEIEditor>
                </SplitPane>
                { this.renderAlertDialog() }
            </div>
        )
    }

    renderOld() {    
        const { teiDocument, editorState } = this.state

        return (
            <div> 
                <TEIEditor 
                editorState={editorState}
                teiDocument={teiDocument}
                onSave={this.requestSave}  
                ></TEIEditor>
            { this.renderAlertDialog() }
            </div>
        )
    }
}
