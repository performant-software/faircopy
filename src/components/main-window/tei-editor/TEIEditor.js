import React, { Component } from 'react'
import {EditorView} from "prosemirror-view"
import { debounce } from "debounce";
import {TextSelection} from "prosemirror-state"

// import applyDevTools from "prosemirror-dev-tools";

import ProseMirrorComponent from "../../common/ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import StructurePalette from "./StructurePalette"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'
import TitleBar from '../TitleBar'
import NotePopup from './NotePopup'
import { transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer } from "../../../model/cut-and-paste"
import { handleEditorHotKeys, navigateFromTreeToEditor, getSelectedElements, broadcastZoneLinks } from '../../../model/editor-navigation'
import { findNoteNode } from '../../../model/xml'

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            noteID: null,
            notePopupAnchorEl: null,
            ctrlDown: false,
            altDown: false,
            elementMenuOptions: null,
            paletteWindowOpen: false,
            currentSubmenuID: 0
        }
        this.drawerRef = null
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
        teiDocument.finalizeEditorView(editorView)
    }

    dispatchTransaction = (transaction) => {
        const { noteID } = this.state
        const { teiDocument, onAlertMessage, onErrorCountChange } = this.props
        const { editorView } = teiDocument

        if( editorView ) {
            teiDocument.onUpdate(transaction,onErrorCountChange)

            // display error messages generated by this transaction
            const alertMessage = transaction.getMeta('alertMessage')
            if( alertMessage ) {
                onAlertMessage(alertMessage)
            }

            const nextNotePopupAnchorEl = this.maintainNoteAnchor()
            const nextNoteID = nextNotePopupAnchorEl ? noteID : null
            const selectedElements = getSelectedElements(teiDocument,noteID)

            if( teiDocument.selectedElements.length === 0 && selectedElements.length > 0 ) {
                setTimeout( () => {
                    const { tr } = editorView.state
                    tr.scrollIntoView()
                    editorView.dispatch(tr)
                }, 100 )        
            }
 
            teiDocument.selectedElements = selectedElements
            broadcastZoneLinks(teiDocument)

            this.setState({...this.state, noteID: nextNoteID, notePopupAnchorEl: nextNotePopupAnchorEl })
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
            const { notePos } = findNoteNode( doc, noteID )
            if( notePos !== null ) {
                const domPos = editorView.domAtPos(notePos)
                return domPos.node.childNodes[domPos.offset]
            } else {
                // anchor element was probably deleted
                return null
            }
        }
        return notePopupAnchorEl
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
                    this.closeNotePopup()
                } else {
                    this.openNotePopup(nextID, event.target)
                }
            }
        } else {
            this.closeNotePopup()
        }
    }

    onTogglePalette = () => {
        const { paletteWindowOpen } = this.state
        this.setState({...this.state, paletteWindowOpen: !paletteWindowOpen})
    }

    openNotePopup(noteID, notePopupAnchorEl) {
        this.setState({...this.state, noteID, notePopupAnchorEl })
    }

    closeNotePopup = () => {
        this.setState({...this.state, noteID: null, notePopupAnchorEl: null })
    }

    onKeyDown = ( event ) => {
        const { teiDocument, altDown, ctrlDown } = this.props 

        if( event.altKey && !altDown ) {
            this.setState({...this.state, altDown: true })
        }
        if( event.ctrlKey && !ctrlDown ) {
            this.setState({...this.state, ctrlDown: true })            
        }

        // if we are on an aside, open it
        if( event.key === 'ArrowRight' || event.key === 'ArrowLeft' ) {
            const { editorView } = teiDocument
            const { selection } = editorView.state
            if( selection && selection.node ) {            
                const { node } = selection    
                const nodeName = node.type.name

                const {teiSchema} = teiDocument.fairCopyProject
                if( teiSchema.elementGroups.asides.includes(nodeName) ) {
                    const noteID = node.attrs['__id__']
                    const { $anchor } = selection
                    const anchorEl = editorView.nodeDOM($anchor.pos)
                    this.openNotePopup(noteID, anchorEl)
                } 
                else {
                    const {editorView} = teiDocument
                    const {tr, selection} = editorView.state
                    const {$anchor} = selection
                    const direction = event.key === 'ArrowRight' ? 1 : -1
                    tr.setSelection(TextSelection.create(tr.doc, $anchor.pos + direction))
                    editorView.dispatch(tr)
                }

                return
            }
        }
 
        return handleEditorHotKeys(event, teiDocument, this.onTogglePalette, this.onOpenElementMenu, this.clipboardSerializer );
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

    onOpenElementMenu = (elementMenuOptions ) => {
        this.setState({...this.state, elementMenuOptions })
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, elementMenuOptions: null })
    }

    onChangePos = (editorGutterPos, editorGutterPath, treeID ) => {
        const { noteID } = this.state
        const { teiDocument } = this.props 
        const editorView = teiDocument.getActiveView()
        const { tr } = editorView.state
        if( treeID === "main" && noteID ) {
            // close the note window
            this.closeNotePopup()
        } else {
            teiDocument.currentTreeNode = { editorGutterPos, editorGutterPath, treeID }
            tr.setMeta( 'highlightEnabled', editorGutterPos === null )
            editorView.dispatch(tr)    
        }
    }

    render() {    
        const { teiDocument, parentResource, hidden, onSave, onDragElement, onAlertMessage, onEditResource, onProjectSettings, onResourceAction, resourceEntry, leftPaneWidth, expandedGutter } = this.props
        const { noteID, notePopupAnchorEl, elementMenuOptions, currentSubmenuID, paletteWindowOpen } = this.state

        const onClickBody = () => {
            const { editorView, currentTreeNode } = teiDocument
            if( editorView && !editorView.hasFocus() && currentTreeNode.editorGutterPos === null ) {
                editorView.focus()
            }
        }

        const onFocus = () => {
            const { currentTreeNode, editorView } = teiDocument
            const { editorGutterPos } = currentTreeNode
            if( editorGutterPos !== null ) {
                teiDocument.currentTreeNode = { editorGutterPos: null, editorGutterPath: null, treeID: "main" }
                navigateFromTreeToEditor( editorView, editorGutterPos )
            }
        }

        const onJumpToDrawer = () => {
            if( this.drawerRef ) {
                this.drawerRef.focus()
            }
        }

        const { selectedElements } = teiDocument
        const drawerHeight = selectedElements.length > 0 ? 300 : 50  //335
        const drawerWidthCSS = `calc(100vw - 30px - ${leftPaneWidth}px)`
        const editorHeight = selectedElements.length > 0 ? 530 : 180

        const editorHeightCSS = `calc(100% - ${editorHeight}px)`
        const editorWidthCSS = `calc(100vw - 10px - ${leftPaneWidth}px)`
        const editorStyle = { minWidth: editorWidthCSS, maxHeight: editorHeightCSS }

        const style = hidden ? { display: 'none' } : {}
        
        return (
            <main 
                style={style} 
                className='TEIEditor'
            > 
                <div
                    onKeyDown={this.onKeyDown} 
                    onKeyUp={this.onKeyUp}                 
                >
                    { !hidden && <TitleBar 
                        teiDocID={ parentResource ? parentResource.id : null } 
                        teiDocName={ parentResource ? parentResource.name : null } 
                        onResourceAction={onResourceAction} 
                        resourceName={resourceEntry.name}>                            
                        </TitleBar> 
                    }
                    { !hidden && <EditorToolbar
                        teiDocument={teiDocument}
                        onSave={onSave}
                        onTogglePalette={this.onTogglePalette}
                        paletteActive={paletteWindowOpen}
                        onProjectSettings={onProjectSettings}
                        onEditResource={onEditResource}
                        onOpenElementMenu={this.onOpenElementMenu}
                        onCloseElementMenu={this.onCloseElementMenu}
                        elementMenuOptions={elementMenuOptions}
                    ></EditorToolbar> }
                    <div id={teiDocument.resourceID} onClick={onClickBody} style={editorStyle} onScroll={this.onScrollEditor} className='body'>
                        { !hidden && <EditorGutter
                            treeID="main"
                            expanded={expandedGutter}
                            onDragElement={onDragElement}
                            teiDocument={teiDocument}
                            editorView={teiDocument.editorView}
                            onJumpToDrawer={onJumpToDrawer}
                            onChangePos={this.onChangePos}
                            gutterTop={120}
                        /> }     
                        <ProseMirrorComponent
                            createEditorView={this.createEditorView}
                            editorView={teiDocument.editorView}
                            onFocus={onFocus}
                            thumbMargin={true}
                        />
                        { !hidden && <ThumbnailMargin
                            teiDocument={teiDocument}
                        /> }      
                    </div>
                    { !hidden && <ParameterDrawer 
                        teiDocument={teiDocument} 
                        onRef={(el) => { this.drawerRef = el}}
                        noteID={noteID}
                        height={drawerHeight}
                        width={drawerWidthCSS}
                    /> }
                </div>
                { !hidden && <NotePopup
                    noteID={noteID}
                    expanded={expandedGutter}
                    teiDocument={teiDocument}
                    onDragElement={onDragElement}
                    onClose={this.closeNotePopup}
                    onAlertMessage={onAlertMessage}
                    onTogglePalette={this.onTogglePalette}
                    onOpenElementMenu={this.onOpenElementMenu}
                    anchorEl={notePopupAnchorEl}
                    drawerRef={this.drawerRef}
                ></NotePopup> }
                { paletteWindowOpen && <StructurePalette
                    onDragElement={onDragElement}
                    leftPaneWidth={leftPaneWidth}
                    teiDocument={teiDocument}
                    currentSubmenuID={currentSubmenuID}
                    onAlertMessage={onAlertMessage}
                    onProjectSettings={onProjectSettings}
                    onChangeMenu={(currentSubmenuID)=>{ this.setState( {...this.state, currentSubmenuID} )}}
                    onClose={()=>{ this.setState( {...this.state, paletteWindowOpen: false} )}}
                  ></StructurePalette> 
                }
            </main>
        )
    }
}
