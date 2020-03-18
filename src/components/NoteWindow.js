import React, { Component } from 'react'

import { debounce } from "debounce";

import TEIDocument from "../tei-document/TEIDocument"
import TEIEditor from './TEIEditor'

const fairCopy = window.fairCopy
const resizeRefreshRate = 100

export default class NoteWindow extends Component {

    constructor() {
        super()
        this.state = {
            noteID: null,
            teiDocument: new TEIDocument(this.onStateChange),
            editorState: null
        }	
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,editorState:nextState})
    }

    componentDidMount() {
        const { teiDocument } = this.state
        // Receive open and save file events from the main process
        fairCopy.services.ipcRegisterCallback('noteOpened', (event, noteID) => this.openNote(noteID))
        window.addEventListener("resize", debounce(teiDocument.refreshView,resizeRefreshRate))
        window.onbeforeunload = this.onBeforeUnload
    }

    onBeforeUnload = () => {
        const { noteID } = this.state
        const { editorView, changedSinceLastSave } = this.state.teiDocument

        if( changedSinceLastSave && editorView ) {
            const { doc } = editorView.state 
            localStorage.setItem(noteID, JSON.stringify(doc.toJSON()))
        }
    }

    openNote( noteID ) {
        const { teiDocument } = this.state
        const { editorView } = teiDocument
        const newEditorState = teiDocument.openNote(noteID)
        if( newEditorState ) {
            editorView.updateState( newEditorState )        
            editorView.focus();
            this.setState( { ...this.state, editorState: newEditorState, noteID })    
        } else {
            console.log(`Unable to load note: ${noteID}`)
        }
    }

    saveAndCloseNote = () => {
        const { noteID, teiDocument } = this.state
        const { editorView } = teiDocument

        if( noteID && editorView ) {
            const {doc} = editorView.state
            localStorage.setItem(noteID, JSON.stringify(doc.toJSON()));
            fairCopy.services.ipcSend( 'closeNoteWindow', noteID )
        }
    }

    render() {    
        const {teiDocument, editorState} = this.state 
        return (
            <TEIEditor 
                editMode="note" 
                onSave={this.saveAndCloseNote}
                teiDocument={teiDocument}
                editorState={editorState}
            ></TEIEditor>
        )
    }
}
