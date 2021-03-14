import React, { Component } from 'react'
import {EditorView} from "prosemirror-view"
import { debounce } from "debounce";

import { Typography } from '@material-ui/core';
// import applyDevTools from "prosemirror-dev-tools";
import {undo, redo} from "prosemirror-history"

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'
import NotePopup from './NotePopup';
import { transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer, cutSelectedNode, copySelectedNode, pasteSelectedNode } from "../tei-document/cut-and-paste"
import { getHighlightRanges } from "../tei-document/highlighter"
import { moveNode } from "../tei-document/editor-actions"

const fairCopy = window.fairCopy

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            noteID: null,
            notePopupAnchorEl: null,
            scrollTop: 0,
            ctrlDown: false,
            altDown: false,
            selectedElements: []
        }

        this.onScrollEditor = debounce( (e) => {
            if( this.el ) {
                const scrollTop = this.el.scrollTop
                this.setState({ ...this.state, scrollTop})    
            }
        }, 100 )
    }

    componentDidMount() {
        const {teiDocument} = this.props
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

    // prevent text entry when a node is selected
    onEditorKeyDown = (editorView,e) => {
        const selection = (editorView) ? editorView.state.selection : null    
        const key = e.key     
        if( selection && selection.node ) {
            return (key === "Backspace" || key === "Delete") ? false : true
        }
    }

    createEditorView = (element) => {
        const { teiDocument } = this.props
        const { teiSchema } = teiDocument.fairCopyProject

        if( teiDocument.editorView ) return;
        this.clipboardSerializer = createClipboardSerializer(teiSchema,teiDocument)

        const editorView = new EditorView( 
            element,
            { 
                dispatchTransaction: this.dispatchTransaction,
                state: teiDocument.initialState,
                handleClickOn: this.onClickOn,
                handleKeyDown: this.onEditorKeyDown,
                transformPastedHTML: transformPastedHTMLHandler(teiSchema,teiDocument),
                transformPasted: transformPastedHandler(teiSchema,teiDocument),
                clipboardSerializer: this.clipboardSerializer
            }
        )
        // uncomment to use ProseMirror dev tools
        // if( process.env['NODE_ENV'] === 'development' ) applyDevTools(editorView)
        editorView.focus()
        teiDocument.finalizeEditorView(editorView)
    }

    dispatchTransaction = (transaction) => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        if( editorView ) {
            const editorState = editorView.state
            const nextEditorState = editorState.apply(transaction)
            editorView.updateState(nextEditorState)
            teiDocument.changedSinceLastSave = teiDocument.changedSinceLastSave || transaction.docChanged
            const nextNotePopupAnchorEl = this.maintainNoteAnchor()
            const selectedElements = this.getSelectedElements()
            this.broadcastZoneLinks(selectedElements)

            if( this.state.selectedElements.length === 0 && selectedElements.length > 0 ) {
                setTimeout( () => {
                    const { tr } = editorView.state
                    tr.scrollIntoView()
                    editorView.dispatch(tr)
                }, 100 )        
            }
            const scrollTop = (this.el) ? this.el.scrollTop : 0
            this.setState({...this.state, selectedElements, scrollTop, notePopupAnchorEl: nextNotePopupAnchorEl })
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
                return domPos.node.childNodes[domPos.offset]
            }
        }
        return notePopupAnchorEl
    }

    onNoteStateChange = () => {
        const selectedElements = this.getSelectedElements()
        this.setState({...this.state, selectedElements })
    }

    onClickOn = ( editorView, pos, node, nodePos, event, direct ) => {
        if( !direct ) return
        
        const { teiDocument } = this.props
        const { asides } = teiDocument.fairCopyProject.teiSchema.elementGroups

        if( asides.includes(node.type.name) ) {
            const { noteID } = this.state
            const nextID = node.attrs['__id__']
            if( noteID !== nextID ) {
                if( noteID !== null ) {
                    this.setState({...this.state, noteID: null, notePopupAnchorEl: null })
                } else {
                    this.setState({...this.state, noteID: nextID, notePopupAnchorEl: event.target })
                }
            }
        } else {
            this.setState({...this.state, noteID: null, notePopupAnchorEl: null })
        }
    }

    onKeyDown = ( event ) => {
        const { ctrlDown, altDown } = this.state
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()
        const metaKey = ( event.ctrlKey || event.metaKey )

        // move structure nodes with arrow keys
        if( event.key === 'ArrowUp' || event.key === 'ArrowDown' ) {
            const selection = (editorView) ? editorView.state.selection : null         
            if( selection && selection.node ) {
                const dir = event.key === 'ArrowUp' ? 'up' : 'down'
                moveNode( dir, teiDocument, metaKey )
            }
        }

        const key = event.key.toLowerCase()
        // console.log(`meta: ${metaKey} shift: ${event.shiftKey} ${key}`)

        if( metaKey && key === 'x' ) {
            cutSelectedNode( teiDocument, this.clipboardSerializer )
        }

        if( metaKey && key === 'c' ) {
            copySelectedNode( teiDocument, this.clipboardSerializer )
        }

        if( metaKey && key === 'v' ) {
            pasteSelectedNode( teiDocument )
        }

        // handle undo and redo here so they are available even when focus is not in PM itself
        if( metaKey && key === 'z' ) {
            undo(editorView.state,editorView.dispatch)
        } 
        if( metaKey && ((event.shiftKey && key === 'z') || key === 'y' )) {
            redo(editorView.state,editorView.dispatch)
        } 

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

    broadcastZoneLinks( selectedElements ) {
        const {teiSchema, idMap} = this.props.teiDocument.fairCopyProject
        const attrSpecs = teiSchema.attrs

        const selectedZones = []
        for( const element of selectedElements ) {
            for( const attr of Object.keys(element.attrs) ) {
                const dataType = attrSpecs[attr]?.dataType

                // is the attribute a tei data pointer?
                if( dataType === 'teidata.pointer' ) {
                    const uris = element.attrs[attr]?.split(" ")
                    if( uris ) {
                        for( const uri of uris ) {
                            // gather any zone uris
                            const entry = idMap.get( uri )
                            if( entry && entry.type === 'zone' ) {
                                selectedZones.push(uri)
                            }
                        }    
                    }
                }
            }
        }

        fairCopy.services.ipcSend('selectedZones', selectedZones )
    }

    getSelectedElements() {
        const { teiDocument } = this.props
        const { noteID } = this.state
        const { asides } = teiDocument.fairCopyProject.teiSchema.elementGroups

        const editorView = teiDocument.getActiveView()
        const selection = (editorView) ? editorView.state.selection : null 
        
        // create a list of the selected phrase level elements 
        let elements = []
        if( selection ) {
            if( selection.node ) {
                // don't display drawer for notes here, see below
                const name = selection.node.type.name
                if( !asides.includes(name) && name !== 'globalNode' && !name.endsWith('X') ) {
                    elements.push( selection.node )
                } else {
                    if( noteID && name.endsWith('X') ) {
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

        return elements
    }

    render() {    
        const { teiDocument, hidden, onSave, onOpenElementMenu, onEditResource, resourceEntry, leftPaneWidth, expandedGutter, elementMenuAnchors } = this.props
        const { scrollTop, noteID, notePopupAnchorEl, selectedElements } = this.state

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
        const editorWidth = `calc(100vw - 10px - ${leftPaneWidth}px)`
        const editorStyle = { minWidth: editorWidth, maxHeight: editorHeight }

        const style = hidden ? { display: 'none' } : {}
        
        return (
            <div 
                style={style} 
                className='TEIEditor'
            > 
                <div
                    onKeyDown={this.onKeyDown} 
                    onKeyUp={this.onKeyUp}                 
                >
                    { !hidden && <div className="titlebar">
                        <Typography component="h1" variant="h6">{resourceEntry.name}</Typography>
                    </div> }
                    { !hidden && <EditorToolbar
                        teiDocument={teiDocument}
                        onSave={onSave}
                        onOpenElementMenu={onOpenElementMenu}
                        elementMenuAnchors={elementMenuAnchors}
                        onEditResource={onEditResource}
                    ></EditorToolbar> }
                    <div onClick={onClickBody} ref={onRef} style={editorStyle} onScroll={this.onScrollEditor} className='body'>
                        { !hidden && <EditorGutter 
                            expanded={expandedGutter}
                            scrollTop={scrollTop} 
                            teiDocument={teiDocument}
                            editorView={teiDocument.editorView}
                            gutterTop={125}
                        /> }     
                        <ProseMirrorComponent
                            createEditorView={this.createEditorView}
                            editorView={teiDocument.editorView}
                            thumbMargin={true}
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
                /> }
                { !hidden && <NotePopup
                    noteID={noteID}
                    expanded={expandedGutter}
                    scrollTop={scrollTop} 
                    teiDocument={teiDocument}
                    anchorEl={notePopupAnchorEl}
                    onStateChange={this.onNoteStateChange}
                ></NotePopup> }
            </div>
        )
    }
}
