import React, { Component } from 'react'

import SplitPane from 'react-split-pane'
import { debounce } from "debounce";

import { EditorView } from "prosemirror-view"
import {DOMSerializer} from "prosemirror-model"

import TEIEditor from './TEIEditor'
import TabbedSidebar from './TabbedSidebar';
import AlertDialog from './AlertDialog';

import TEISchema from "../tei-document/TEISchema"

const resizeRefreshRate = 100

export default class MainWindow extends Component {

    constructor() {
        super()
        this.state = {
            editorState: null,
            width: -300,
            alertDialogMode: false
        }	
    }

    componentDidMount() {
        const { teiDocument } = this.props.fairCopyProject
        window.addEventListener("resize", debounce(teiDocument.refreshView,resizeRefreshRate))
        window.onbeforeunload = this.onBeforeUnload
    }

    onBeforeUnload = (e) => {
        const { teiDocument } = this.props.fairCopyProject
        const { changedSinceLastSave } = teiDocument
        const { exitAnyway } = this.state
    
        if( !exitAnyway && changedSinceLastSave ) {
            this.setState({ ...this.state, alertDialogMode: 'close'})
            e.returnValue = false
        } 
    }

    onStateChange = (nextState) => {
        this.setState({...this.state,editorState:nextState})
    }

    createEditorView = (onClick,element) => {
        const { teiSchema, teiDocument } = this.props.fairCopyProject

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
        const { teiDocument } = this.props.fairCopyProject
        const { editorView } = teiDocument

        if( editorView ) {
            const editorState = editorView.state
            const nextEditorState = editorState.apply(transaction)
            editorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            this.onStateChange(nextEditorState)
        }
    }

    render() {
        const { alertDialogMode, editorState, width } = this.state
        const { teiDocument } = this.props.fairCopyProject
        const refreshCallback = debounce(teiDocument.refreshView,resizeRefreshRate)

        const onChange = (sidebarWidth) => {
            const boundingRect = this.el? this.el.getBoundingClientRect() : null
            const windowWidth = boundingRect ? boundingRect.width : 0
            this.setState({...this.state, width: windowWidth - sidebarWidth })
            refreshCallback()
        }
        
        return (
            <div ref={(el) => this.el = el} > 
                <SplitPane split="vertical" minSize={0} defaultSize={300} onChange={onChange}>
                    <TabbedSidebar
                        editorState={editorState}
                        teiDocument={teiDocument}                                      
                    ></TabbedSidebar>                
                    <TEIEditor 
                        width={width}
                        editorState={editorState}
                        teiDocument={teiDocument}
                        createEditorView={this.createEditorView}
                        onSave={this.requestSave}  
                    ></TEIEditor>
                </SplitPane>
                <AlertDialog
                    alertDialogMode={alertDialogMode}
                ></AlertDialog>
            </div>
        )
    }

}
