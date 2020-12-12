import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import {EditorView} from "prosemirror-view"
import EditorGutter from "./EditorGutter"
// import applyDevTools from "prosemirror-dev-tools";

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
        const { teiDocument, noteID } = this.props
        const { teiSchema } = teiDocument.fairCopyProject
        const { noteEditorView } = this.state

        if( !noteID ) {
            this.saveNote()
            this.setState({...this.state, noteEditorView: null})
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
        // if( process.env['NODE_ENV'] === 'development' ) applyDevTools(editorView)
        editorView.focus()
        teiDocument.noteEditorView = editorView
        this.setState( { ...this.state, currentNoteID: noteID, noteEditorView: editorView } )
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument, onStateChange } = this.props
        const { noteEditorView } = this.state

        if( noteEditorView ) {
            const editorState = noteEditorView.state
            const nextEditorState = editorState.apply(transaction)
            noteEditorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            onStateChange(nextEditorState)
        }
    }

    saveNote() {
        const { teiDocument } = this.props
        const { currentNoteID, noteEditorView } = this.state
        if( noteEditorView ) {
            const editorState = noteEditorView.state
            teiDocument.saveNote(currentNoteID,editorState)                
        }
    }

    destroyEditorView = (editorView) => {
        const { teiDocument } = this.props
        this.saveNote()
        editorView.destroy()
        teiDocument.noteEditorView = null
        this.setState({ ...this.state, currentNoteID: null, noteEditorView: null })
    }

    renderEditor() {
        const { teiDocument, expanded } = this.props
        const { noteEditorView } = this.state

        const onRef = (el) => {
            this.el = el
        }

        const gutterTop = (this.el) ? this.el.getBoundingClientRect().top - 5 : 0
        // if( this.el ) console.log(`top: ${gutterTop}`)

        return (
            <div className='note-body' ref={onRef}>
                <EditorGutter 
                    scrollTop={0} 
                    gutterTop={gutterTop}
                    expanded={expanded}
                    teiDocument={teiDocument}
                    editorView={noteEditorView}
                /> 
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
