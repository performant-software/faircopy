import React, { Component } from 'react'

import ProseMirrorComponent from "./ProseMirrorComponent"
import EditorGutter from "./EditorGutter"
import ParameterDrawer from './ParameterDrawer'
import EditorToolbar from './EditorToolbar'
import ThumbnailMargin from './ThumbnailMargin'

const dialogPlaneThreshold = 200

export default class TEIEditor extends Component {

    dialogPlaneClass() {
        const { editorView } = this.props

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
        const { teiDocument, editMode, onSave, width, createEditorView } = this.props

        const scrollTop = this.el ? this.el.scrollTop : 0

        return (
            <div className='TEIEditor'> 
                <div>
                    <EditorToolbar
                        editMode={editMode}
                        teiDocument={teiDocument}
                        onSave={onSave}
                        width={width}
                    ></EditorToolbar>
                    <div style={{width: width ? width : '100%'}} ref={(el) => this.el = el } className='body'>
                        <EditorGutter 
                            scrollTop={scrollTop} 
                            teiDocument={teiDocument}
                        />                 
                        <ProseMirrorComponent
                            createEditorView={createEditorView}
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
