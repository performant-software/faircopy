import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const gutterTop = 125
const validStructureTags = ['p','lineGroup']

export default class EditorGutter extends Component {

    renderGutterMarkers() {
        const { teiDocument, scrollTop, ctrlDown, onOpenElementMenu } = this.props
        const { editorView } = teiDocument
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
                const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
                const className = `marker ${highlighted}`
                const displayName = (ctrlDown) ? structureTag : ''

                const onClick = () => {
                    const {tr} = editorState
                    tr.setSelection( NodeSelection.create(tr.doc, pos) )
                    editorView.dispatch(tr)
                }

                const onContextMenu = (e) => {                    
                    onOpenElementMenu('chunk',e.currentTarget)
                }

                gutterMarks.push(
                    <div 
                        key={markKey} 
                        onClick={onClick} 
                        onContextMenu={onContextMenu} 
                        style={markStyle} 
                        className={className}
                        >
                        {displayName}
                    </div>
                )                        
                return false
            }
            return true
        })

        return gutterMarks
    }

    render() {   
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        if( !editorView ) return null

        return (
            <div className='EditorGutter'>
                { this.renderGutterMarkers() }
            </div>
        ) 
    }
}
