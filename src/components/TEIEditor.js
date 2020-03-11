import React, { Component } from 'react'

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'
import SplitPane from 'react-split-pane'

const fairCopy = window.fairCopy

const dialogPlaneThreshold = 200

export default class TEIEditor extends Component {

    handleClickOn = (view,pos,node,nodePos,event,direct) => {
        const nodeType = node.type.name
        if( !direct ) return;

        if( nodeType === 'note' ) {
            const {__id__} = node.attrs
            fairCopy.services.ipcSend( 'createNoteEditorWindow', __id__ )
        }
        else if( event.ctrlKey) { 
            const { doc } = this.state.editorState
            const $pos = doc.resolve(pos)
            const marks = $pos.marks()
            for( let mark of marks ) {
                if( mark.type.name === 'ref' ) {
                    const {target} = mark.attrs
                    if( target && target[0] === '#') {
                        // TODO support internal IDs
                        fairCopy.services.ipcSend( 'createNoteEditorWindow', target.slice(1) )
                        return
                    }        
                    // TODO support URL targets
                }
            }
        }
    }

    dialogPlaneClass() {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        if( editorView ) {
            const { selection } = editorView.state
            if( selection ) {
                const { $anchor } = selection
                const selectionRect = editorView.coordsAtPos($anchor.pos)
                if( selectionRect.top < dialogPlaneThreshold ) return 'dialogPlaneBottom'    
            }
            // Control based on Y position of selection anchor
            return 'dialogPlaneTop'   
        }
    }

    render() {    
        const { teiDocument, editMode, onSave } = this.props

        const scrollTop = this.el ? this.el.scrollTop : 0
        const boundingRect = this.el? this.el.getBoundingClientRect() : null
        const width = boundingRect ? boundingRect.width : 0
        const height = boundingRect ? boundingRect.height : 0

        return (
            <div className='TEIEditor'> 
                <SplitPane 
                    split="horizontal" 
                    minSize={55} 
                    defaultSize={height-120} 
                    pane2Style={{ background: '#fff8dd'}}
                >
                    <div>
                        <EditorToolbar
                            editMode={editMode}
                            teiDocument={teiDocument}
                            onSave={onSave}
                            width={width}
                        ></EditorToolbar>
                        <div ref={(el) => this.el = el } className='body'>
                            <EditorGutter 
                                scrollTop={scrollTop} 
                                teiDocument={teiDocument}
                            />                 
                            <ProseMirrorComponent
                                onClick={this.handleClickOn}
                                teiDocument={teiDocument}
                            />
                            <ThumbnailMargin
                                scrollTop={scrollTop} 
                                teiDocument={teiDocument}
                            />                 
                        </div>
                    </div>
                    <div>
                        <ParameterDrawer 
                            width={width}
                            teiDocument={teiDocument} 
                        />
                    </div>
                </SplitPane>
            </div>
        )
    }
}
