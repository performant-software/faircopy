import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const clipHeight = 1000

export default class EditorGutter extends Component {

    renderGutterMark(node,targetPos,top,bottom,index,column,style,columnPositions) {
        const { expanded, editorView } = this.props
        const editorState = editorView.state

        const height = bottom - top 
        const markStyle = { top, height, marginLeft: columnPositions[column] }
        const markKey = `gutter-mark-${index}`
        const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
        const className = `marker ${highlighted} ${style}`
        const displayName = (expanded) ? <div className={`el-name`}>{node.type.name}</div> : ''

        const onClick = () => {
            const {tr,doc} = editorState
            tr.setSelection( new NodeSelection(doc.resolve(targetPos-1)) )
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
        const { teiDocument, editorView, expanded, scrollTop, gutterTop } = this.props
        const editorState = editorView.state
        const { hard } = teiDocument.fairCopyProject.teiSchema.elementGroups
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
                    columnThickness[column] = Math.max(columnThickness[column], thickness + 12)
                }
            } else {
                columnThickness[column] = 15
            }
        }

        const processNode = (parentNode,basePos=0,column=0) => {
            let relativePos=0
            for( let i=0; i < parentNode.childCount; i++ ) {
                const node = parentNode.child(i)
                const startPos = basePos+relativePos+1
                const name = node.type.name
                const element = teiDocument.fairCopyProject.teiSchema.elements[name]
                if( element && element.gutterMark ) {
                    gatherColumnThickness(name,column)
                    const endPos = startPos + processNode(node,startPos,column+1) + 1
                    let top = editorView.coordsAtPos(startPos).top - gutterTop + scrollTop
                    let bottom = editorView.coordsAtPos(endPos-3).bottom - gutterTop + scrollTop
                    if( top === bottom ) bottom = top + 30
                    const style = hard.includes(name) ? 'hard' : 'soft'
                    // console.log(`${name}: ${startPos} -> ${endPos}, lines: ${lines}`)
                    gutterMarks.push( [ node,startPos,top,bottom,gutterMarks.length,column,style] )
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
        const { editorView } = this.props

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
