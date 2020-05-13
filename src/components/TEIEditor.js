import React, { Component } from 'react'

import {EditorView} from "prosemirror-view"
import {DOMSerializer} from "prosemirror-model"
import { debounce } from "debounce";

import TEISchema from "../tei-document/TEISchema"

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    componentDidMount() {
        const { teiDocument } = this.props
        window.addEventListener("resize", debounce(teiDocument.refreshView,resizeRefreshRate))
        window.onbeforeunload = this.onBeforeUnload
    }

    onBeforeUnload = (e) => {
        const { teiDocument } = this.props
        const { changedSinceLastSave } = teiDocument
        const { exitAnyway } = this.state
    
        if( !exitAnyway && changedSinceLastSave ) {
            // TODO send callback
            // this.setState({ ...this.state, alertDialogMode: 'close'})
            e.returnValue = false
        } 
    }

    createEditorView = (onClick,element) => {
        const { teiDocument } = this.props
        const { teiSchema } = teiDocument

        if( teiDocument.editorView ) return;

        const editorView = new EditorView( 
            element,
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: teiDocument.initialState,
                handleClickOn: onClick,
                transformPastedHTML: teiSchema.transformPastedHTML,
                transformPasted: teiSchema.transformPasted,
                clipboardSerializer: this.createClipboardSerializer()
            }
        )
        editorView.focus()
        teiDocument.editorView = editorView
    }


    createClipboardSerializer() {
        // clipboard serialize always serializes to TEI XML
        const clipboardSchema = new TEISchema();
        clipboardSchema.teiMode = true
        return DOMSerializer.fromSchema( clipboardSchema.schema )
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument, onStateChange } = this.props
        const { editorView } = teiDocument

        if( editorView ) {
            const editorState = editorView.state
            const nextEditorState = editorState.apply(transaction)
            editorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            onStateChange(nextEditorState)
        }
    }

    render() {    
        const { teiDocument, editMode, onSave, width } = this.props

        const scrollTop = this.el ? this.el.scrollTop : 0

        return (
            <div className='TEIEditor'> 
                <div>
                    <EditorToolbar
                        editMode={editMode}
                        teiDocument={teiDocument}
                        onSave={onSave}
                        width={width}
                    ></EditorToolbar>
                    <div style={{width: width ? width : '100%'}} ref={(el) => this.el = el } className='body'>
                        <EditorGutter 
                            scrollTop={scrollTop} 
                            teiDocument={teiDocument}
                        />                 
                        <ProseMirrorComponent
                            createEditorView={this.createEditorView}
                            editorView={teiDocument.editorView}
                        />
                        <ThumbnailMargin
                            scrollTop={scrollTop} 
                            teiDocument={teiDocument}
                        />                 
                    </div>
                </div>
                <ParameterDrawer 
                    width={width}
                    teiDocument={teiDocument} 
                />
            </div>
        )
    }
}
