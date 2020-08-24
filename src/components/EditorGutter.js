import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const gutterTop = 125
const validStructureTags = ['p','l','sp','speaker']

export default class EditorGutter extends Component {

    renderGutterMark(node,pos,index,depth) {
        const { teiDocument, scrollTop, ctrlDown, onOpenElementMenu } = this.props
        const { editorView, fairCopyProject } = teiDocument
        const editorState = editorView.state

        const startCoords = editorView.coordsAtPos(pos)
        const endCoords = editorView.coordsAtPos(pos + node.nodeSize)
        const top = startCoords.top - gutterTop + scrollTop
        const height = endCoords.bottom - startCoords.top - 8 
        const markStyle = { top, height }
        const markKey = `gutter-mark-${index}`
        const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
        const className = `marker col${depth} ${highlighted}`
        const displayName = (ctrlDown) ? `${node.type.name}-${depth}` : ''


        const onClick = () => {
            const {tr,doc} = editorState
            tr.setSelection( new NodeSelection(doc.resolve(pos)) )
            editorView.dispatch(tr)
        }

        const onContextMenu = (e) => {            
            const { menus } = fairCopyProject
            const menuGroups = menus['chunk']
            onOpenElementMenu({ menuGroups, anchorEl: e.currentTarget, action: 'replace', actionData: { pos }})
        }

        return (
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
    }

    renderGutterMarkers() {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const editorState = editorView.state
        const gutterMarks = []

        const processNode = (node,depth) => {
            node.forEach( (node,pos) => {
                const structureTag = node.type.name    
                if( validStructureTags.includes( structureTag ) ) {
                    gutterMarks.push( this.renderGutterMark(node,pos,gutterMarks.length,depth) )
                    processNode(node,depth+1)
                }    
            })
        }

        processNode(editorState.doc,0)

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
