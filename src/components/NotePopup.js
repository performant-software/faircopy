import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import {EditorView} from "prosemirror-view"

import ProseMirrorComponent from "./ProseMirrorComponent"
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer} from "../tei-document/cut-and-paste"

export default class NotePopup extends Component {

    constructor() {
        super()
        this.state = {
            currentNoteID: null,
            noteEditorView: null
        }
    }

    createEditorView = (element) => {
        const { noteEditorView } = this.state
        const { teiDocument, noteID } = this.props
        const { teiSchema } = teiDocument.fairCopyProject

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
        this.setState( { ...this.state, currentNoteID: noteID, noteEditorView: editorView } )
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument } = this.props
        const { noteEditorView } = this.state

        if( noteEditorView ) {
            const editorState = noteEditorView.state
            const nextEditorState = editorState.apply(transaction)
            noteEditorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
        }
    }

    destroyEditorView = (editorView) => {
        const { teiDocument } = this.props
        const { currentNoteID } = this.state
        const editorState = editorView.state
        teiDocument.saveNote(currentNoteID,editorState)
        editorView.destroy()
        this.setState({ ...this.state, currentNoteID: null, noteEditorView: null })
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
