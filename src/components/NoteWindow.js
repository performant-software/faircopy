import React, { Component } from 'react'

import {EditorState, TextSelection} from "prosemirror-state"
import { debounce } from "debounce";

import TEIDocument from "../tei-document/TEIDocument"
import TEIEditor from './TEIEditor'

const {ipcRenderer} = window.fairCopy.electron
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
        ipcRenderer.on('noteOpened', (event, noteID) => this.openNote(noteID))
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
        const noteJSON = JSON.parse( localStorage.getItem(noteID) )
        const doc = teiDocument.teiSchema.schema.nodeFromJSON(noteJSON);
        const newEditorState = EditorState.create({
            doc,
            selection: TextSelection.create(doc, 0),
            plugins: teiDocument.plugins
        })
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
            ipcRenderer.send( 'closeNoteWindow', noteID )
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
