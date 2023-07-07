import React, { Component } from 'react'
import {EditorView} from "prosemirror-view"
import { debounce } from "debounce";
import { HotKeys } from 'react-hotkeys'

// import applyDevTools from "prosemirror-dev-tools";

import ProseMirrorComponent from "../../common/ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import StructurePalette from "./StructurePalette"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'
import ReadOnlyToolbar from './ReadOnlyToolbar'
import TitleBar from '../TitleBar'
import NotePopup from './NotePopup'
import { transformPastedHTMLHandler,transformPastedHandler, createClipboardSerializer } from "../../../model/cut-and-paste"
import { navigateFromTreeToEditor, getSelectedElements, broadcastZoneLinks, navigateFromEditorToTree, getEditorCommands, arrowNavToNote } from '../../../model/editor-navigation'
import { findNoteNode } from '../../../model/xml'
import { canConfigAdmin } from '../../../model/permissions'
import { getConfigStatus } from '../../../model/faircopy-config'
import { getHotKeyConfig } from "../../../model/editor-keybindings"

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            noteID: null,
            notePopupAnchorEl: null,
            elementMenuOptions: null,
            paletteWindowOpen: false,
            drawerPinned: false,
            currentSubmenuID: 0
        }
        this.drawerRef = null
    }

    componentDidMount() {
        this.resizeListener = debounce(this.onResize,resizeRefreshRate)
        window.addEventListener("resize", this.resizeListener )
        window.onbeforeunload = this.onBeforeUnload
        // bit of a hack to make the gutter settle into the right shape on initial load
        setTimeout( this.onResize, 1000 )
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.resizeListener )
    }

    onResize = () => {
        const { teiDocument } = this.props
        teiDocument.gutterMarkCacheDirty = true
        teiDocument.refreshView()
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

    // Since the editor isn't a react component, some hotkeys are handled by editor directly
    onEditorKeyDown = (editorView,e) => {
        const { teiDocument } = this.props
        const selection = (editorView) ? editorView.state.selection : null    
        const key = e.key     

        if( key === 'ArrowLeft' ) {
            arrowNavToNote( this.openNotePopup, teiDocument, -1 )
            return 
        }

        if( key === 'ArrowRight') {
            arrowNavToNote( this.openNotePopup, teiDocument, 1 )
            return
        }

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
                editable: () => { return teiDocument.isEditable() },
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
            // display error messages generated by this transaction
            const alertMessage = transaction.getMeta('alertMessage')
            if( alertMessage ) {
                onAlertMessage(alertMessage)
            }

            // update document state
            teiDocument.onUpdate(transaction)

            // get next selection state
            const selectedElements = getSelectedElements(teiDocument,noteID)

            // opening parameter drawer
            if( teiDocument.selectedElements.length === 0 && selectedElements.length > 0 ) {
                setTimeout( () => {
                    const { tr } = editorView.state
                    tr.scrollIntoView()
                    editorView.dispatch(tr)
                }, 100 )        
            }

            // closing parameter drawer, update system flags
            if( teiDocument.selectedElements.length > 0 && selectedElements.length === 0 ) {
                // TODO can I debounce this?
                setTimeout( () => {
                    const { tr } = editorView.state
                    teiDocument.updateSystemFlags(tr,onErrorCountChange)
                    editorView.dispatch(tr)
                }, 100 )                   
            }

            // update selection state
            teiDocument.selectedElements = selectedElements

            // maintain note position
            const nextNotePopupAnchorEl = this.maintainNoteAnchor()
            const nextNoteID = nextNotePopupAnchorEl ? noteID : null
 
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
        const { currentTreeNode } = teiDocument

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

        // if the document is read only, clicking on the body deselects the editor gutter
        if( !teiDocument.isEditable() && currentTreeNode.editorGutterPos !== null ) {
            teiDocument.currentTreeNode = { editorGutterPos: null, editorGutterPath: null, treeID: "main" }
            teiDocument.refreshView()
        }
    }

    onTogglePalette = () => {
        const { paletteWindowOpen } = this.state
        this.setState({...this.state, paletteWindowOpen: !paletteWindowOpen})
    }

    onDrawerPinToggle = () => {
        const { drawerPinned } = this.state
        this.setState({...this.state, drawerPinned: !drawerPinned})
    }

    openNotePopup = (noteID, notePopupAnchorEl) => {
        this.setState({...this.state, noteID, notePopupAnchorEl })
    }

    closeNotePopup = () => {
        const { noteID, notePopupAnchorEl } = this.state
        if( noteID !== null || notePopupAnchorEl !== null ) {
            this.setState({...this.state, noteID: null, notePopupAnchorEl: null })
        }
    }

    getMainEditorHotKeyConfig() {
        const { teiDocument } = this.props 
        
        // get the base hotkey config
        const { keyMap, handlers } = getHotKeyConfig( teiDocument, getEditorCommands( teiDocument, this.onTogglePalette, this.onOpenElementMenu, this.clipboardSerializer ) )

        keyMap.hopToTree = 'shift+tab'
        handlers.hopToTree = () => {
            const { editorView } = teiDocument
            const { treeID } = teiDocument.currentTreeNode
            const { editorGutterPos } = teiDocument.currentTreeNode
    
            if( editorGutterPos === null ) {
                const { nextPos, nextPath } = navigateFromEditorToTree( editorView )
                this.onChangePos(nextPos, nextPath, treeID)
            }
        }
     
        return { keyMap, handlers }
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
        const { teiDocument, hidden, onSave, onDragElement, onAlertMessage, onEditResource, onProjectSettings, onResourceAction, leftPaneWidth, currentView } = this.props
        const { noteID, notePopupAnchorEl, elementMenuOptions, currentSubmenuID, drawerPinned, paletteWindowOpen } = this.state
        const { fairCopyProject, parentEntry, resourceEntry } = teiDocument
        const { isLoggedIn, configLastAction, userID, permissions, remote } = fairCopyProject
        const readOnly = !teiDocument.isEditable() 

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
        const drawerHeight = drawerPinned || selectedElements.length > 0 ? 300 : 50 
        const drawerWidthCSS = `calc(100vw - 30px - ${leftPaneWidth}px)`
        const editorHeight = drawerPinned || selectedElements.length > 0 ? 530 : 180

        const editorHeightCSS = `calc(100% - ${editorHeight}px)`
        const editorWidthCSS = `calc(100vw - 10px - ${leftPaneWidth}px)`
        const editorStyle = { minWidth: editorWidthCSS, maxHeight: editorHeightCSS }
        const style = hidden ? { display: 'none' } : {}

        const canConfig = canConfigAdmin(permissions)
        const lockStatus = getConfigStatus( configLastAction, userID )
        const canEditConfig = !remote || (canConfig && lockStatus === 'checked_out')

        const { keyMap, handlers } = this.getMainEditorHotKeyConfig()
        
        return (
            <main 
                style={style} 
                className='TEIEditor'
            > 
                <HotKeys 
                    keyMap={keyMap} 
                    handlers={handlers} 
                    allowChanges={true}
                >
                    <div>
                        { !hidden && <TitleBar 
                            parentResource={parentEntry} 
                            onResourceAction={onResourceAction} 
                            resourceName={resourceEntry.name}    
                            currentView={currentView}     
                            isLoggedIn={isLoggedIn}
                            >                   
                            </TitleBar> 
                        }
                        { !hidden && readOnly ? <ReadOnlyToolbar onAlertMessage={ onAlertMessage } teiDocument={teiDocument}>
                            </ReadOnlyToolbar> :
                            <EditorToolbar
                                teiDocument={teiDocument}
                                onSave={onSave}
                                onTogglePalette={this.onTogglePalette}
                                paletteActive={paletteWindowOpen}
                                onProjectSettings={onProjectSettings}
                                onEditResource={onEditResource}
                                onOpenElementMenu={this.onOpenElementMenu}
                                onCloseElementMenu={this.onCloseElementMenu}
                                elementMenuOptions={elementMenuOptions}
                            ></EditorToolbar>
                        }
                        <div id={teiDocument.resourceID} onClick={onClickBody} style={editorStyle} onScroll={this.onScrollEditor} className='body'>
                            { !hidden && <EditorGutter
                                treeID="main"
                                onDragElement={onDragElement}
                                teiDocument={teiDocument}
                                editorView={teiDocument.editorView}
                                onJumpToDrawer={onJumpToDrawer}
                                onChangePos={this.onChangePos}
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
                            drawerPinned={drawerPinned}
                            onDrawerPinToggle={this.onDrawerPinToggle}
                            noteID={noteID}
                            height={drawerHeight}
                            width={drawerWidthCSS}
                            readOnly={readOnly}
                            canEditConfig={canEditConfig}
                        /> }
                    </div>
                </HotKeys>
                { !hidden && <NotePopup
                    noteID={noteID}
                    teiDocument={teiDocument}
                    onDragElement={onDragElement}
                    onClose={this.closeNotePopup}
                    onAlertMessage={onAlertMessage}
                    onTogglePalette={this.onTogglePalette}
                    onOpenElementMenu={this.onOpenElementMenu}
                    anchorEl={notePopupAnchorEl}
                    drawerRef={this.drawerRef}
                ></NotePopup> }
                { paletteWindowOpen && !readOnly && <StructurePalette
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
