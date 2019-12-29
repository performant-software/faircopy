import React, { Component } from 'react'

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'

const {ipcRenderer} = window.fairCopy.electron

const dialogPlaneThreshold = 200

export default class TEIEditor extends Component {

    handleClickOn = (view,pos,node,nodePos,event,direct) => {
        const nodeType = node.type.name
        if( !direct ) return;

        if( nodeType === 'note' ) {
            const {__id__} = node.attrs
            ipcRenderer.send( 'createNoteEditorWindow', __id__ )
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
                        ipcRenderer.send( 'createNoteEditorWindow', target.slice(1) )
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
        const { teiDocument } = this.props

        const scrollTop = this.el ? this.el.scrollTop : 0
        const boundingRect = this.el? this.el.getBoundingClientRect() : null
        const width = boundingRect ? boundingRect.width : 0

        return (
            <div className='TEIEditor'> 
                <div className='header'>
                    <EditorToolbar
                        teiDocument={teiDocument}
                    ></EditorToolbar>
                </div>
                <div>
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
                    <div className={this.dialogPlaneClass()}>
                        <ParameterDrawer 
                            width={width}
                            teiDocument={teiDocument} 
                        />
                    </div> 
                </div>
            </div>
        )
    }
}
