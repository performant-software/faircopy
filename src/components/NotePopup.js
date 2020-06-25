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
            scrollTop: 0,
            noteEditorView: null
        }
    }

    onScroll = () => {
        if( this.el ) {
            const scrollTop = this.el.scrollTop
            this.setState({...this.state,scrollTop})    
        }
    }

    createEditorView = (element) => {
        const { noteEditorView } = this.state
        const { teiDocument, noteID } = this.props
        const { teiSchema } = teiDocument.fairCopyProject

        if( noteEditorView ) return;

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
        this.setState( { ...this.state, noteEditorView: editorView } )
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

    editorViewDestroyed = () => {
        this.setState({ ...this.state, noteEditorView: null })
    }

    renderEditor() {
        const { noteEditorView } = this.state

        const onRef = (el) => {
            this.el = el
            if( el ) {
                el.addEventListener("scroll", debounce(this.onScroll,resizeRefreshRate))
            }
        }

        return (
            <div ref={onRef} className='note-body'>
                <ProseMirrorComponent
                    editorViewDestroyed={this.editorViewDestroyed}
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
