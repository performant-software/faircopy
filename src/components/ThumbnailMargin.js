import React, { Component } from 'react';

const marginTop = 52

export default class ThumbnailMargin extends Component {
    
    renderThumbnails() {
        const { teiDocument, scrollTop } = this.props
        const { editorView } = teiDocument

        const editorState = editorView.state

        const thumbnails = []
        editorState.doc.descendants( (node,pos) => {
            const structureTag = node.type.name
            if( structureTag === 'pb' ) {
                const startCoords = editorView.coordsAtPos(pos)
                const top = startCoords.top - marginTop + scrollTop
                const thumbStyle = { top }
                const thumbKey = `facs-thumb-${thumbnails.length}`
                const thumbSrc = node.attrs['facs']
                if( thumbSrc ) {
                    thumbnails.push(
                        <img key={thumbKey} style={thumbStyle} className="facs-thumbnail" alt={thumbSrc} src={thumbSrc}></img>
                    )                            
                } else {
                    thumbnails.push(
                        <div key={thumbKey} style={thumbStyle} className="facs-thumbnail"><span className="fas fa-10x fa-file-alt"></span></div> 
                    )                            
                }
                return false
            }
            return true
        })
    
        return thumbnails
    }

    render() {   
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        if( !editorView ) return null
        
        return (
            <div id="ThumbnailMargin">
                { this.renderThumbnails() }
            </div>
        )     
    }
}
