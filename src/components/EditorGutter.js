import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const gutterTop = 125
const clipHeight = 1000

export default class EditorGutter extends Component {

    renderGutterMark(node,startPos,top,bottom,index,column,columnPositions) {
        const { teiDocument, expanded } = this.props
        const { editorView } = teiDocument
        const editorState = editorView.state

        const height = bottom - top 
        const markStyle = { top, height, marginLeft: columnPositions[column] }
        const markKey = `gutter-mark-${index}`
        const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
        const className = `marker ${highlighted}`
        const displayName = (expanded) ? <div className={`el-name`}>{node.type.name}</div> : ''

        const onClick = () => {
            const {tr,doc} = editorState
            tr.setSelection( new NodeSelection(doc.resolve(startPos)) )
            editorView.dispatch(tr)
        }

        return (
            <div 
                key={markKey} 
                onClick={onClick} 
                style={markStyle} 
                className={className}
                >
                {displayName}
            </div>
        )
    }

    renderGutterMarkers() {
        const { teiDocument, expanded, scrollTop } = this.props
        const { editorView } = teiDocument
        const editorState = editorView.state
        const canvas = document.createElement("canvas")

        const columnThickness = []
        const gutterMarks = []
        const columnPositions = []

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

        const processNode = (parentNode,basePos=0,column=0) => {
            let relativePos=0
            for( let i=0; i < parentNode.childCount; i++ ) {
                const node = parentNode.child(i)
                const startPos = basePos+relativePos
                const name = node.type.name
                const element = teiDocument.fairCopyProject.teiSchema.elements[name]
                if( element && element.gutterMark ) {
                    gatherColumnThickness(name,column)
                    const endPos = startPos + processNode(node,startPos+1,column+1)
                    const top = editorView.coordsAtPos(startPos).top - gutterTop + scrollTop
                    const bottom = editorView.coordsAtPos(endPos).bottom - gutterTop + scrollTop
                    gutterMarks.push( [ node,startPos,top,bottom,gutterMarks.length,column] )
                } else {
                    processNode(node,startPos+1,column)                
                }
                relativePos = relativePos + node.nodeSize
            }
            return relativePos
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
         const gutterMarkEls = []
         for( const gutterMark of gutterMarks ) {
             const top = gutterMark[2]
             const bottom = gutterMark[3]
             if( bottom > scrollTop && top < scrollTop+clipHeight ) {
                 gutterMarkEls.push( this.renderGutterMark(...gutterMark, columnPositions) )
             }
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
