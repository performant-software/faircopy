import React, { Component } from 'react'
import {EditorView} from "prosemirror-view"
import { debounce } from "debounce";

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
import { getHighlightRanges } from "../../../model/highlighter"
import { handleEditorHotKeys, navigateFromTreeToEditor } from '../../../model/editor-navigation'

const fairCopy = window.fairCopy

const resizeRefreshRate = 100

export default class TEIEditor extends Component {

    constructor() {
        super()
        this.state = {
            noteID: null,
            notePopupAnchorEl: null,
            ctrlDown: false,
            altDown: false,
            selectedElements: [],
            elementMenuOptions: null,
            paletteWindowOpen: false,
            currentTreeNode: { editorGutterPos: null, editorGutterPath: null, treeID: "main" },
            currentSubmenuID: 0
        }
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

            let nextTreeNode = transaction.getMeta('currentTreeNode') ? transaction.getMeta('currentTreeNode') : this.state.currentTreeNode

            const nextNotePopupAnchorEl = this.maintainNoteAnchor()
            const nextNoteID = nextNotePopupAnchorEl ? noteID : null
            const selectedElements = this.getSelectedElements(nextTreeNode)
            this.broadcastZoneLinks(selectedElements)

            if( this.state.selectedElements.length === 0 && selectedElements.length > 0 ) {
                setTimeout( () => {
                    const { tr } = editorView.state
                    tr.scrollIntoView()
                    editorView.dispatch(tr)
                }, 100 )        
            }
 
            this.setState({...this.state, selectedElements, noteID: nextNoteID, notePopupAnchorEl: nextNotePopupAnchorEl, currentTreeNode: nextTreeNode })
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
            } else {
                // anchor element was probably deleted
                return null
            }
        }
        return notePopupAnchorEl
    }

    onNoteStateChange = (nextTreeNode) => {
        const currentTreeNode = nextTreeNode ? nextTreeNode : this.state.currentTreeNode
        const selectedElements = this.getSelectedElements(currentTreeNode)
        this.setState({...this.state, selectedElements, currentTreeNode })
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

    onTogglePalette = () => {
        const { paletteWindowOpen } = this.state
        this.setState({...this.state, paletteWindowOpen: !paletteWindowOpen})
    }

    onKeyDown = ( event ) => {
        const { teiDocument, altDown, ctrlDown } = this.props 

        if( event.altKey && !altDown ) {
            this.setState({...this.state, altDown: true })
        }
        if( event.ctrlKey && !ctrlDown ) {
            this.setState({...this.state, ctrlDown: true })            
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

    broadcastZoneLinks( selectedElements ) {
        const {teiDocument} = this.props
        const {teiSchema, idMap} = teiDocument.fairCopyProject
        const parentEntry = teiDocument.getParent()

        const selectedZones = []
        for( const element of selectedElements ) {
            for( const attr of Object.keys(element.attrs) ) {
                const attrSpec = teiSchema.getAttrSpec( attr, element.type.name )
                const dataType = attrSpec?.dataType

                // is the attribute a tei data pointer?
                if( dataType === 'teidata.pointer' ) {
                    const uris = element.attrs[attr]?.split(" ")
                    if( uris ) {
                        for( const uri of uris ) {
                            // gather any zone uris
                            const entry = idMap.get( uri, parentEntry?.localID )
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

    getSelectedElements(currentTreeNode) {
        const { teiDocument } = this.props
        const { noteID } = this.state
        const { asides } = teiDocument.fairCopyProject.teiSchema.elementGroups
        const { editorGutterPos } = currentTreeNode

        const editorView = teiDocument.getActiveView()
        const selection = (editorView) ? editorView.state.selection : null 
        
        // create a list of the selected phrase level elements 
        let elements = []
        if( editorGutterPos !== null ) {
            const { doc } = editorView.state
            const $pos = doc.resolve(editorGutterPos)
            const node = $pos.node().child($pos.index())
            elements.push( node )
        } else if( selection ) {
            if( selection.node ) {
                // don't display drawer for notes here, see below
                const name = selection.node.type.name
                if( !asides.includes(name) && !name.includes('globalNode') && !name.endsWith('X') ) {
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
                // highlight ranges are not active when there's a browser selection 
                const browserSelection = window.getSelection()
                if( browserSelection.isCollapsed ) {
                    const { doc } = editorView.state
                    const { $anchor } = selection
                    const highlightRanges = getHighlightRanges(doc,$anchor)
                    for( const highlightRange of highlightRanges ) {
                        elements.push( highlightRange.mark )
                    }         
                } 
            }
        } 

        return elements
    }

    onOpenElementMenu = (elementMenuOptions ) => {
        this.setState({...this.state, elementMenuOptions })
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, elementMenuOptions: null })
    }

    onChangePos = (editorGutterPos, editorGutterPath, treeID ) => {
        const { teiDocument } = this.props 
        const editorView = teiDocument.getActiveView()
        const { tr } = editorView.state
        const currentTreeNode = { editorGutterPos, editorGutterPath, treeID }
        tr.setMeta( 'currentTreeNode', currentTreeNode )
        tr.setMeta( 'highlightEnabled', editorGutterPos === null )
        editorView.dispatch(tr)
    }

    render() {    
        const { teiDocument, parentResource, hidden, onSave, onDragElement, onAlertMessage, onEditResource, onProjectSettings, onResourceAction, resourceEntry, leftPaneWidth, expandedGutter } = this.props
        const { noteID, notePopupAnchorEl, selectedElements, elementMenuOptions, currentSubmenuID, paletteWindowOpen, currentTreeNode } = this.state

        const onClickBody = () => {
            const { editorView } = teiDocument
            const { currentTreeNode } = this.state
            if( editorView && !editorView.hasFocus() && currentTreeNode && currentTreeNode.editorGutterPos === null ) {
                editorView.focus()
            }
        }

        const onFocus = () => {
            const { currentTreeNode } = this.state
            const { editorGutterPos } = currentTreeNode
            if( editorGutterPos !== null ) {
                const { editorView } = teiDocument
                navigateFromTreeToEditor( editorView, editorGutterPos, "main" )
            }
        }

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
                            currentTreeNode={currentTreeNode}
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
                        elements={selectedElements}
                        height={drawerHeight}
                        width={drawerWidthCSS}
                    /> }
                </div>
                { !hidden && <NotePopup
                    noteID={noteID}
                    expanded={expandedGutter}
                    teiDocument={teiDocument}
                    onDragElement={onDragElement}
                    onAlertMessage={onAlertMessage}
                    currentTreeNode={currentTreeNode}
                    onTogglePalette={this.onTogglePalette}
                    onOpenElementMenu={this.onOpenElementMenu}
                    anchorEl={notePopupAnchorEl}
                    onChangePos={this.onChangePos}
                    onStateChange={this.onNoteStateChange}
                ></NotePopup> }
                { paletteWindowOpen && <StructurePalette
                    onDragElement={onDragElement}
                    leftPaneWidth={leftPaneWidth}
                    teiDocument={teiDocument}
                    currentSubmenuID={currentSubmenuID}
                    currentTreeNode={currentTreeNode}
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
