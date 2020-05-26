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
import { Typography } from '@material-ui/core';
import SearchBar from './SearchBar';

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            scrollTop: 0
        }
    }

    componentDidMount() {
        const { teiDocument } = this.props
        this.resizeListener = debounce(teiDocument.refreshView,resizeRefreshRate)
        window.addEventListener("resize", this.resizeListener )
        window.onbeforeunload = this.onBeforeUnload
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.resizeListener )
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
        teiDocument.refreshView()
    }

    createClipboardSerializer() {
        const { teiDocument } = this.props
        const { teiSchema } = teiDocument
        // clipboard serialize always serializes to TEI XML
        const clipboardSchema = new TEISchema(teiSchema.schemaJSON);
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

    onScroll = () => {
        if( this.el ) {
            const scrollTop = this.el.scrollTop
            this.setState({...this.state,scrollTop})    
        }
    }

    render() {    
        const { teiDocument, editMode, width, hidden, onOpenElementMenu, fairCopyProject } = this.props
        const { scrollTop } = this.state

        const onRef = (el) => {
            this.el = el
            if( el ) {
                el.addEventListener("scroll", debounce(this.onScroll,resizeRefreshRate))
            }
        }

        const style = hidden ? { display: 'none' } : {}
        const resourceName = fairCopyProject.resources[teiDocument.resourceID].name

        return (
            <div style={style} className='TEIEditor'> 
                <div>
                    <div className="titlebar">
                        <SearchBar></SearchBar>
                        <Typography component="h1" variant="h6">{resourceName}</Typography>
                    </div>
                    <EditorToolbar
                        editMode={editMode}
                        teiDocument={teiDocument}
                        width={width}
                        onOpenElementMenu={onOpenElementMenu}
                    ></EditorToolbar>
                    <div style={{width: width ? width : '100%'}} ref={onRef} className='body'>
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
