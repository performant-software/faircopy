import React, { Component } from 'react'
import {EditorView} from "prosemirror-view"
import { debounce } from "debounce";
import { Typography } from '@material-ui/core';

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'
import SearchBar from './SearchBar';
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer} from "../tei-document/cut-and-paste"
import NotePopup from './NotePopup';

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            scrollTop: 0,
            noteID: null,
            notePopupAnchorEl: null
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

    createEditorView = (element) => {
        const { teiDocument } = this.props
        const { teiSchema } = teiDocument.fairCopyProject

        if( teiDocument.editorView ) return;

        const editorView = new EditorView( 
            element,
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: teiDocument.initialState,
                handleClickOn: this.onClickOn,
                transformPastedHTML: transformPastedHTMLHandler(teiSchema),
                transformPasted: transformPastedHandler(teiSchema),
                clipboardSerializer: createClipboardSerializer(teiSchema)
            }
        )
        editorView.focus()
        teiDocument.editorView = editorView
        teiDocument.refreshView()
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

    onClickOn = ( editorView, pos, node, nodePos, event, direct ) => {
        if( node.type.name === 'note' ) {
            const noteID = node.attrs['__id__']
            this.setState({...this.state, noteID, notePopupAnchorEl: event.target })
        }
    }

    onClosePopupMenu = () => {
        this.setState({...this.state, notePopupAnchorEl: null })
    }

    render() {    
        const { teiDocument, width, hidden, onOpenElementMenu, onEditResource, fairCopyProject } = this.props
        const { scrollTop, noteID, notePopupAnchorEl } = this.state

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
                        teiDocument={teiDocument}
                        width={width}
                        onOpenElementMenu={onOpenElementMenu}
                        onEditResource={onEditResource}
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
                <NotePopup
                    teiDocument={teiDocument}
                    noteID={noteID}
                    anchorEl={notePopupAnchorEl}
                    onClose={this.onClosePopupMenu}        
                ></NotePopup>
            </div>
        )
    }
}
