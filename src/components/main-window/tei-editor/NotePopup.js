import React, { Component } from 'react'
import { Popper, Paper } from '@material-ui/core'
import {EditorView} from "prosemirror-view"
import EditorGutter from "./EditorGutter"
// import applyDevTools from "prosemirror-dev-tools";

import ProseMirrorComponent from "../../common/ProseMirrorComponent"
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer } from "../../../model/cut-and-paste"
import {addTextNodes} from "../../../model/xml"
import { handleEditorHotKeys, navigateFromTreeToEditor } from "../../../model/editor-navigation"

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
        const { teiDocument, onStateChange, onAlertMessage } = this.props
        const { noteEditorView } = teiDocument

        // TODO how to handle error counts here?

        // display error messages generated by this transaction
        const alertMessage = transaction.getMeta('alertMessage')
        if( alertMessage ) {
            onAlertMessage(alertMessage)
        }

        if( noteEditorView ) {
            const editorState = noteEditorView.state
            const nextEditorState = editorState.apply(transaction)
            noteEditorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            const currentTreeNode = transaction.getMeta('currentTreeNode')
            onStateChange(currentTreeNode)
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

    onChangePos = (editorGutterPos, editorGutterPath, treeID) => {
        const { teiDocument } = this.props 
        const editorView = teiDocument.getActiveView()
        const { tr } = editorView.state
        const currentTreeNode = { editorGutterPos, editorGutterPath, treeID }
        tr.setMeta( 'currentTreeNode', currentTreeNode )
        tr.setMeta( 'highlightEnabled', editorGutterPos === null )
        editorView.dispatch(tr)
    }

    onKeyDown = ( event ) => {
        const { teiDocument, onTogglePalette, onOpenElementMenu } = this.props

        if( event.key === 'Escape' ) {
            // TODO close window and save
        }
        else {
            return handleEditorHotKeys(event, teiDocument, onTogglePalette, onOpenElementMenu, this.clipboardSerializer )
        }
    }

    renderEditor() {
        const { teiDocument, expanded, onDragElement, currentTreeNode } = this.props
        const { noteEditorView } = teiDocument

        const onFocus = () => {
            const { editorGutterPos } = currentTreeNode
            if( editorGutterPos !== null ) {
                const editorView = teiDocument.noteEditorView
                navigateFromTreeToEditor( editorView, editorGutterPos )
            }
        }
        
        const onRef = (el) => {
            this.el = el
        }

        const gutterTop = (this.el) ? this.el.getBoundingClientRect().top - 5 : 0
        // if( this.el ) console.log(`top: ${gutterTop}`)

        return (
            <div className='note-body' ref={onRef} onKeyDown={this.onKeyDown} >
                <EditorGutter 
                    treeID="note"
                    gutterTop={gutterTop}
                    expanded={expanded}
                    onDragElement={onDragElement}
                    teiDocument={teiDocument}
                    editorView={noteEditorView}
                    currentTreeNode={currentTreeNode}
                    onChangePos={this.onChangePos}
                /> 
                <ProseMirrorComponent
                    destroyEditorView={this.destroyEditorView}
                    createEditorView={this.createEditorView}
                    onFocus={onFocus}
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
