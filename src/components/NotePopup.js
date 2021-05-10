import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import {EditorView} from "prosemirror-view"
import EditorGutter from "./EditorGutter"
import applyDevTools from "prosemirror-dev-tools";

import ProseMirrorComponent from "./ProseMirrorComponent"
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer} from "../tei-document/cut-and-paste"
import {addTextNodes} from "../tei-document/xml"

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
            this.saveSubDoc()
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
        if( process.env['NODE_ENV'] === 'development' ) applyDevTools(editorView)
        editorView.focus()
        teiDocument.noteEditorView = editorView
        addTextNodes(editorView)

        this.setState( { ...this.state, currentNoteID: noteID } )
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument, onStateChange } = this.props
        const { noteEditorView } = teiDocument

        if( noteEditorView ) {
            const editorState = noteEditorView.state
            const nextEditorState = editorState.apply(transaction)
            noteEditorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            onStateChange(nextEditorState)
        }
    }

    saveSubDoc() {
        const { teiDocument } = this.props
        const { noteEditorView } = teiDocument
        const { currentNoteID } = this.state
        if( noteEditorView ) {
            const editorState = noteEditorView.state
            teiDocument.saveSubDoc(currentNoteID,editorState)                
        }
    }

    destroyEditorView = (editorView) => {
        const { teiDocument } = this.props
        this.saveSubDoc()
        editorView.destroy()
        teiDocument.noteEditorView = null
        this.setState({ ...this.state, currentNoteID: null })
    }

    renderEditor() {
        const { teiDocument, expanded } = this.props
        const { noteEditorView } = teiDocument

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
