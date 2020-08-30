import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const gutterTop = 125

export default class EditorGutter extends Component {

    renderGutterMark(node,pos,index,column) {
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
        const className = `marker col${column} ${highlighted}`
        const displayName = (ctrlDown) ? <div className={`el-name col${column}`}>{node.type.name}</div> : ''


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

        const processNode = (parentNode,basePos=0,column=0) => {
            let relativePos=0
            for( let i=0; i < parentNode.childCount; i++ ) {
                const node = parentNode.child(i)
                const pos = basePos+relativePos
                const element = teiDocument.fairCopyProject.teiSchema.elements[node.type.name]
                if( element && element.gutterMark ) {
                    gutterMarks.push( this.renderGutterMark(node,pos,gutterMarks.length,column) )
                    processNode(node,pos+1,column+1)                
                } else {
                    processNode(node,pos+1,column)                
                }
                relativePos = relativePos + node.nodeSize
            }
        }

        processNode(editorState.doc)

        return gutterMarks
    }

    render() {   
        const { teiDocument, ctrlDown } = this.props
        const { editorView } = teiDocument

        if( !editorView ) return null

        const className = `markers ${ctrlDown ? 'thick' : 'thin'}`
        return (
            <div className='EditorGutter'>
                <div className={className}>
                    { this.renderGutterMarkers() }
                </div>
            </div>
        ) 
    }
}
