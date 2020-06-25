import React, { Component } from 'react'
import { Popper, Paper, ClickAwayListener } from '@material-ui/core'
import { debounce } from "debounce";
import {EditorView} from "prosemirror-view"

import ProseMirrorComponent from "./ProseMirrorComponent"
// import EditorGutter from "./EditorGutter"
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer} from "../tei-document/cut-and-paste"

const resizeRefreshRate = 100

export default class NotePopup extends Component {

    constructor() {
        super()
        this.state = {
            scrollTop: 0
        }
    }

    onScroll = () => {
        if( this.el ) {
            const scrollTop = this.el.scrollTop
            this.setState({...this.state,scrollTop})    
        }
    }

    createEditorView = (element) => {
        const { teiDocument, noteID } = this.props
        const { teiSchema } = teiDocument.fairCopyProject

        if( teiDocument.noteEditorView ) return;

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
        teiDocument.refreshNoteView()
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

    renderEditor() {
        const { teiDocument } = this.props
        // const { scrollTop } = this.state

        const onRef = (el) => {
            this.el = el
            if( el ) {
                el.addEventListener("scroll", debounce(this.onScroll,resizeRefreshRate))
            }
        }

        return (
            <div style={{width: 300}} ref={onRef} className='body'>
                <ProseMirrorComponent
                    createEditorView={this.createEditorView}
                    editorView={teiDocument.noteEditorView}
                />                  
            </div>
        )        
    }

    render() {
        const { anchorEl, onClose } = this.props

        if( !anchorEl ) return null

        const placement = 'bottom-start'
        const elevation = 6

        return (
            <div id="NotePopup">
                 <Popper className="note-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                    <Paper elevation={elevation}>
                        <ClickAwayListener onClickAway={onClose}>
                            {this.renderEditor()}                            
                        </ClickAwayListener>
                    </Paper>
                </Popper>
            </div>
        )
    }
}
