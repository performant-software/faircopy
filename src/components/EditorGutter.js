import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const gutterTop = 125
const maxGutterMarks = 100

export default class EditorGutter extends Component {

    renderGutterMark(node,pos,index,column,columnPositions) {
        const { teiDocument, scrollTop, expanded, onOpenElementMenu } = this.props
        const { editorView, fairCopyProject } = teiDocument
        const editorState = editorView.state

        const startCoords = editorView.coordsAtPos(pos)
        const endCoords = editorView.coordsAtPos(pos + node.nodeSize)
        const top = startCoords.top - gutterTop + scrollTop
        const height = endCoords.bottom - startCoords.top - 8 
        const markStyle = { top, height, marginLeft: columnPositions[column] }
        const markKey = `gutter-mark-${index}`
        const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
        const className = `marker ${highlighted}`
        const displayName = (expanded) ? <div className={`el-name`}>{node.type.name}</div> : ''


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
        const { teiDocument, expanded } = this.props
        const { editorView } = teiDocument
        const editorState = editorView.state
        const gutterMarks = [], gutterMarkEls = []
        const columnThickness = [], columnPositions = []
        const canvas = document.createElement("canvas")

        function getTextWidth(text) {
            const context = canvas.getContext("2d")
            // must match CSS for: .EditorGutter .markers
            context.font = "12pt sans-serif"
            const metrics = context.measureText(text)
            return Math.floor(metrics.width)
        }

        // find the max width for each column
        function gatherColumnThickness(name, column) {
            if( expanded ) {
                const thickness = getTextWidth(name)
                if( isNaN(columnThickness[column]) ) {
                    columnThickness[column] = thickness + 12
                } else {
                    columnThickness[column] = Math.max(columnThickness[column], thickness)
                }
            } else {
                columnThickness[column] = 15
            }
        }

        function processNode(parentNode,basePos=0,column=0) {
            if( gutterMarks.length >= maxGutterMarks ) return 
            let relativePos=0
            for( let i=0; i < parentNode.childCount; i++ ) {
                const node = parentNode.child(i)
                const pos = basePos+relativePos
                const element = teiDocument.fairCopyProject.teiSchema.elements[node.type.name]
                if( element && element.gutterMark ) {
                    const name = node.type.name
                    gatherColumnThickness(name,column)
                    gutterMarks.push( [ node,pos,gutterMarks.length,column] )
                    processNode(node,pos+1,column+1)                
                } else {
                    processNode(node,pos+1,column)                
                }
                relativePos = relativePos + node.nodeSize
            }
        }

        // turn PM nodes into gutter mark properties
        processNode(editorState.doc)

        // once the max column width is known, calculate column positions
        let totalWidth = 0
        for( let i=0; i < columnThickness.length; i++ ) {
            columnPositions[i] = totalWidth 
            totalWidth += columnThickness[i]
        }

        // render the components 
        for( const gutterMark of gutterMarks ) {
            gutterMarkEls.push( this.renderGutterMark(...gutterMark, columnPositions) )
        }

        return { gutterMarkEls, totalWidth }
    }

    render() {   
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        if( !editorView ) return null

        const { gutterMarkEls, totalWidth } = this.renderGutterMarkers()
        const style = { marginRight: totalWidth }

        return (
            <div className='EditorGutter'>
                <div className='markers' style={style}>
                    { gutterMarkEls }
                </div>
            </div>
        ) 
    }
}
