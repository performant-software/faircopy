import React, { Component } from 'react';
import { NodeSelection } from "prosemirror-state"

const clipHeight = 1000

export default class EditorGutter extends Component {

    renderName( nodeName ) {
        const { expanded } = this.props
        if( !expanded ) return ''
        const name = nodeName.endsWith('X') ? nodeName.slice(0,-1) : nodeName
        return <div className={`el-name`}>{name}</div>
    }

    getBorderStyles( node ) {
        const borderAttr = node.attrs['__border__']
        if( borderAttr ) {
            const [ pos, valid ] = borderAttr.split(' ')
            const color = valid==='true' ? 'green' : 'red'
            let styles = {}
            if( pos === 'Center' ) {
                styles.border = `4px solid ${color}`
            } else {
                styles[`border${pos}`] = `4px solid ${color}`
            }
            return styles
        } else {
            return {}
        }
    }

    renderGutterMark(node,targetPos,top,bottom,index,column,style,columnPositions) {
        const { editorView } = this.props
        const editorState = editorView.state

        const height = bottom - top 
        const borderStyles = this.getBorderStyles(node)
        const markStyle = { top, height, marginLeft: columnPositions[column], ...borderStyles }
        const markKey = `gutter-mark-${index}`
        const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
        const className = `marker ${highlighted} ${style}`

        const onClick = () => {
            const {tr,doc} = editorState
            tr.setSelection( new NodeSelection(doc.resolve(targetPos-1)) )
            editorView.dispatch(tr)
        }

        return (
            <div 
                key={markKey} 
                onClick={onClick} 
                datanodepos={targetPos-1}
                style={markStyle} 
                className={className}
                >
                {this.renderName(node.type.name)}
            </div>
        )
    }

    renderGutterMarkers() {
        const { teiDocument, editorView, expanded, scrollTop, gutterTop } = this.props
        const editorState = editorView.state
        const { hard, docNodes } = teiDocument.fairCopyProject.teiSchema.elementGroups
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
                const displayName = (name === 'noteX') ? 'note' : name
                const thickness = getTextWidth(displayName)
                if( isNaN(columnThickness[column]) ) {
                    columnThickness[column] = thickness + 24
                } else {
                    columnThickness[column] = Math.max(columnThickness[column], thickness + 24)
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
                    const endPosSamplePoint = (endPos >= 3) ? endPos-3 : endPos // trying the inside of text, if it exists
                    let bottom = editorView.coordsAtPos(endPosSamplePoint).bottom - gutterTop + scrollTop
                    if( top === bottom ) bottom = top + 30
                    let style = hard.includes(name) || docNodes.includes(name) ? 'hard' : 'soft'
                    if( node.attrs['__error__'] ) style = style.concat(' error')

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
