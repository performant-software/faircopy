import React, { Component } from 'react'
import {EditorView} from "prosemirror-view"
import { debounce } from "debounce";
import { Typography } from '@material-ui/core';

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'
import NotePopup from './NotePopup';
import {transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer} from "../tei-document/cut-and-paste"
import { getHighlightRanges } from "../tei-document/highlighter"

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            noteID: null,
            notePopupAnchorEl: null,
            scrollTop: 0,
            displayNoteAttrs: false,
            ctrlDown: false,
            altDown: false,
            selectedElements: []
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
                transformPastedHTML: transformPastedHTMLHandler(teiSchema,teiDocument),
                transformPasted: transformPastedHandler(teiSchema,teiDocument),
                clipboardSerializer: createClipboardSerializer(teiSchema,teiDocument)
            }
        )
        editorView.focus()
        teiDocument.editorView = editorView
        teiDocument.refreshView()
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        if( editorView ) {
            const editorState = editorView.state
            const nextEditorState = editorState.apply(transaction)
            editorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            this.maintainNoteAnchor()
            const selectedElements = this.getSelectedElements()

            if( this.state.selectedElements.length === 0 && selectedElements.length > 0 ) {
                setTimeout( () => {
                    const { tr } = editorView.state
                    tr.scrollIntoView()
                    editorView.dispatch(tr)
                }, 100 )        
            }
            const scrollTop = (this.el) ? this.el.scrollTop : 0
            this.setState({...this.state, selectedElements, scrollTop })
        }
    }

    // editing a note's attributes changes the DOM, invalidating notePopupAnchorEl
    // this function keeps it attached to the right part of the DOM
    maintainNoteAnchor() {
        const {teiDocument} = this.props
        const {editorView} = teiDocument
        const {noteID, notePopupAnchorEl} = this.state 
        if( notePopupAnchorEl ) {
            const { doc } = editorView.state
            let notePos = null
            doc.descendants( (node,pos) => {
                if( node.attrs['__id__'] === noteID ) {
                    notePos = pos
                }
                if( notePos !== null ) return false
            })
            if( notePos !== null ) {
                const domPos = editorView.domAtPos(notePos)
                const nextNotePopupAnchorEl = domPos.node
                this.setState({ ...this.state, notePopupAnchorEl: nextNotePopupAnchorEl })
            }
        }
    }

    onClickOn = ( editorView, pos, node, nodePos, event, direct ) => {
        if( !direct ) return

        if( node.type.name === 'note' ) {
            const { noteID, ctrlDown } = this.state
            const nextID = node.attrs['__id__']
            if( noteID !== nextID ) {
                if( noteID !== null ) {
                    this.setState({...this.state, noteID: null, notePopupAnchorEl: null, displayNoteAttrs: false })
                } else {
                    const displayNoteAttrs = ctrlDown
                    this.setState({...this.state, noteID: nextID, notePopupAnchorEl: event.target, displayNoteAttrs })
                }
            }
        } else {
            this.setState({...this.state, noteID: null, notePopupAnchorEl: null, displayNoteAttrs: false })
        }
    }

    onKeyDown = ( event ) => {
        const { ctrlDown, altDown } = this.state

        if( event.altKey && !altDown ) {
           this.setState({...this.state, altDown: true })
        }
        if( event.ctrlKey && !ctrlDown ) {
            this.setState({...this.state, ctrlDown: true })            
        }
    }

    onKeyUp = ( event ) => {
        const { ctrlDown, altDown } = this.state

        if( !event.altKey && altDown ) {
            this.setState({...this.state, altDown: false })
        }
        if( !event.ctrlKey && ctrlDown ) {
            this.setState({...this.state, ctrlDown: false })            
        }
    }

    getSelectedElements() {
        const { teiDocument } = this.props
        const { noteID } = this.state

        const editorView = teiDocument.getActiveView()
        const selection = (editorView) ? editorView.state.selection : null 
        
        // create a list of the selected phrase level elements 
        let elements = []
        if( selection ) {
            if( selection.node ) {
                // don't display drawer for notes on selection
                if( selection.node.type.name !== 'note' ) {
                    elements.push( selection.node )
                }
            } else {
                const { doc } = editorView.state
                const { $anchor } = selection
                const highlightRanges = getHighlightRanges(doc,$anchor)
                for( const highlightRange of highlightRanges ) {
                    elements.push( highlightRange.mark )
                }     
            }
        }

        if( noteID ) {
            // The note node is sticky while the note is being edited
            const { doc } = teiDocument.editorView.state
            let noteNode
            doc.descendants( (node) => {
                if( node.attrs['__id__'] === noteID ) {
                    noteNode = node
                }
                if( noteNode ) return false
            })
            if( noteNode ) {
                elements.push( noteNode )
            }
        }

        return elements
    }

    render() {    
        const { teiDocument, hidden, onOpenElementMenu, onEditResource, fairCopyProject, onStateChange, editorWidth } = this.props
        const { scrollTop, noteID, notePopupAnchorEl, displayNoteAttrs, selectedElements } = this.state

        // used to update scroll position when document changes
        const onRef = (el) => {
            this.el = el
        }

        const onClickBody = () => {
            const { editorView } = teiDocument
            if( editorView && !editorView.hasFocus() ) {
                editorView.focus()
            }
        }

        const drawerHeight = selectedElements.length > 0 ? 335 : 35
        const editorHeight = `calc(100% - ${drawerHeight + 130}px)`
        const editorStyle = { minWidth: editorWidth, maxHeight: editorHeight }

        const style = hidden ? { display: 'none' } : {}
        const resourceName = fairCopyProject.resources[teiDocument.resourceID].name

        const parameterDrawProps = ( displayNoteAttrs ) ? { noteID } : {}

        return (
            <div 
                style={style} 
                onKeyDown={this.onKeyDown} 
                onKeyUp={this.onKeyUp} 
                className='TEIEditor'
            > 
                <div>
                    { !hidden && <div className="titlebar">
                        <Typography component="h1" variant="h6">{resourceName}</Typography>
                    </div> }
                    { !hidden && <EditorToolbar
                        teiDocument={teiDocument}
                        onOpenElementMenu={onOpenElementMenu}
                        onEditResource={onEditResource}
                    ></EditorToolbar> }
                    <div onClick={onClickBody} ref={onRef} style={editorStyle} className='body'>
                        { !hidden && <EditorGutter 
                            scrollTop={scrollTop} 
                            teiDocument={teiDocument}
                        /> }     
                        <ProseMirrorComponent
                            createEditorView={this.createEditorView}
                            editorView={teiDocument.editorView}
                        />
                        { !hidden && <ThumbnailMargin
                            scrollTop={scrollTop} 
                            teiDocument={teiDocument}
                        /> }      
                    </div>
                </div>
                { !hidden && <ParameterDrawer 
                    teiDocument={teiDocument} 
                    elements={selectedElements}
                    height={drawerHeight}
                    { ...parameterDrawProps }
                /> }
                { !hidden && <NotePopup
                    teiDocument={teiDocument}
                    noteID={noteID}
                    anchorEl={notePopupAnchorEl}
                    onStateChange={onStateChange}
                ></NotePopup> }
            </div>
        )
    }
}
