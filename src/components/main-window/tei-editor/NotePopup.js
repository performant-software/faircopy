import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import {EditorView} from "prosemirror-view"
import EditorGutter from "./EditorGutter"
// import applyDevTools from "prosemirror-dev-tools";
import {undo, redo} from "prosemirror-history"

import ProseMirrorComponent from "../../common/ProseMirrorComponent"
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer, cutSelectedNode, copySelectedNode, pasteSelectedNode} from "../../../model/cut-and-paste"
import {addTextNodes} from "../../../model/xml"

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
        this.clipboardSerializer = createClipboardSerializer(teiSchema,teiDocument)

        const editorView = new EditorView( 
            element,
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: initialState,
                transformPastedHTML: transformPastedHTMLHandler(teiSchema),
                transformPasted: transformPastedHandler(teiSchema),
                clipboardSerializer: this.clipboardSerializer
            }
        )
        // if( process.env['NODE_ENV'] === 'development' ) applyDevTools(editorView)
        editorView.focus()
        teiDocument.noteEditorView = editorView
        addTextNodes(editorView.state,editorView.dispatch)

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


    onKeyDown = ( event ) => {
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()
        const metaKey = ( event.ctrlKey || event.metaKey )

        const key = event.key.toLowerCase()

        if( metaKey && key === 'x' ) {
            cutSelectedNode( teiDocument, this.clipboardSerializer )
        }

        if( metaKey && key === 'c' ) {
            copySelectedNode( teiDocument, this.clipboardSerializer )
        }

        if( metaKey && key === 'v' ) {
            pasteSelectedNode( teiDocument )
        }

        if( metaKey && key === 'z' ) {
            undo(editorView.state,editorView.dispatch)
        } 
        if( metaKey && ((event.shiftKey && key === 'z') || key === 'y' )) {
            redo(editorView.state,editorView.dispatch)
        } 
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
            <div className='note-body' ref={onRef} onKeyDown={this.onKeyDown} >
                <EditorGutter 
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
