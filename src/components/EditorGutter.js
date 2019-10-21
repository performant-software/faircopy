import React, { Component } from 'react';

const gutterTop = 131
const validStructureTags = ['p','lineGroup']

export default class EditorGutter extends Component {

    renderGutterMarkers() {
        const { editorView, scrollTop } = this.props
        const editorState = editorView.state

        const gutterMarks = []
        editorState.doc.descendants( (node,pos) => {
            const structureTag = node.type.name
            if( validStructureTags.includes( structureTag ) ) {
                const startCoords = editorView.coordsAtPos(pos)
                const endCoords = editorView.coordsAtPos(pos + node.nodeSize)
                const top = startCoords.top - gutterTop + scrollTop
                const height = endCoords.bottom - startCoords.top - 8 
                const markStyle = { top, height }
                const markKey = `gutter-mark-${gutterMarks.length}`
                const className = `marker ${structureTag}`
                gutterMarks.push(
                    <div key={markKey} style={markStyle} className={className}></div>
                )                        
                return false
            }
            return true
        })

        return gutterMarks
    }

    render() {   
        if( !this.props.editorView ) return null

        return (
            <div className='EditorGutter'>
                { this.renderGutterMarkers() }
            </div>
        ) 
    }
}
