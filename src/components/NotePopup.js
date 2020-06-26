import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import {EditorView} from "prosemirror-view"

import ProseMirrorComponent from "./ProseMirrorComponent"
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer} from "../tei-document/cut-and-paste"

export default class NotePopup extends Component {

    constructor() {
        super()
        this.state = {
            currentNoteID: null
        }
    }

    createEditorView = (element) => {
        const { teiDocument, noteID } = this.props
        const { teiSchema } = teiDocument.fairCopyProject
        const { noteEditorView } = teiDocument

        if( !noteID ) {
            this.saveNote()
            teiDocument.noteEditorView = null
            return
        } 

        if( noteEditorView ) return
        const initialState = teiDocument.openSubDocument( noteID )

        const editorView = new EditorView( 
            element,
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: initialState,
                transformPastedHTML: transformPastedHTMLHandler(teiSchema),
                transformPasted: transformPastedHandler(teiSchema),
                clipboardSerializer: createClipboardSerializer(teiSchema)
            }
        )
        editorView.focus()
        teiDocument.noteEditorView = editorView
        this.setState( { ...this.state, currentNoteID: noteID } )
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument } = this.props
        const { noteEditorView } = teiDocument

        if( noteEditorView ) {
            const editorState = noteEditorView.state
            const nextEditorState = editorState.apply(transaction)
            noteEditorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
        }
    }

    saveNote() {
        const { teiDocument } = this.props
        const { currentNoteID } = this.state
        const { noteEditorView } = teiDocument
        const editorState = noteEditorView.state
        teiDocument.saveNote(currentNoteID,editorState)
    }

    destroyEditorView = (editorView) => {
        const { teiDocument } = this.props
        this.saveNote()
        editorView.destroy()
        teiDocument.noteEditorView = null
        this.setState({ ...this.state, currentNoteID: null })
    }

    renderEditor() {
        const { noteEditorView } = this.state

        return (
            <div className='note-body'>
                <ProseMirrorComponent
                    destroyEditorView={this.destroyEditorView}
                    createEditorView={this.createEditorView}
                    editorView={noteEditorView}
                />                  
            </div>
        )        
    }

    render() {
        const { anchorEl } = this.props

        if( !anchorEl ) return null

        const placement = 'bottom-start'
        const elevation = 6

        return (
            <div id="NotePopup">
                 <Popper className="note-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                    <Paper elevation={elevation}>
                        { this.renderEditor() }            
                    </Paper>
                </Popper>
            </div>
        )
    }
}
