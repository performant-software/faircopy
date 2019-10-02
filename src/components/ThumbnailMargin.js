import React, { Component } from 'react';

const marginTop = 60

export default class ThumbnailMargin extends Component {
    
    renderThumbnails() {
        const { editorView, scrollTop } = this.props
        const editorState = editorView.state

        const thumbnails = []
        editorState.doc.descendants( (node,pos) => {
            const structureTag = node.type.name
            if( structureTag === 'pb' ) {
                const startCoords = editorView.coordsAtPos(pos)
                const top = startCoords.top - marginTop + scrollTop
                const thumbStyle = { top }
                const thumbKey = `facs-thumb-${thumbnails.length}`
                thumbnails.push(
                    <img key={thumbKey} style={thumbStyle} className="facs-thumbnail" alt="test" src='img/leaf.png'></img>
                )                        
                return false
            }
            return true
        })
    
        return thumbnails
    }

    render() {   
        if( !this.props.editorView ) return null
        
        return (
            <div id="ThumbnailMargin">
                { this.renderThumbnails() }
            </div>
        )     
    }
}
