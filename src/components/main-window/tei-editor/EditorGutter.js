import React, { Component } from 'react'
import { navigateTree } from '../../../model/editor-navigation'
import { moveNode, eraseSelection } from '../../../model/editor-actions'
import { synthNameToElementName } from '../../../model/xml'

export default class EditorGutter extends Component {

    renderName( nodeName ) {
        const { expanded } = this.props
        if( !expanded ) return ''
        return <div aria-hidden="true" className={`el-name`}>{ synthNameToElementName( nodeName )}</div>
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

    renderGutterMark(elementID,targetPos,top,bottom,index,column,markerClass,borderStyles,columnPositions) {
     
        const onClick = () => {
            const { onChangePos, treeID } = this.props
            const editorGutterPath = synthNameToElementName(elementID)
            onChangePos( targetPos, editorGutterPath, treeID )
        }

        const onStartDrag = (e) => {
            const ctrlDown = (e.ctrlKey || e.metaKey)
            const { onDragElement } = this.props

            // don't drag aside root elements
            if( ctrlDown && !elementID.endsWith('X') ) {
                const x = e.clientX;
                const y = e.clientY;
                onDragElement(elementID,{x, y},"palette")
            } else {
                // otherwise, ignore this event
                return false
            }
        }

        const { teiDocument, treeID } = this.props
        const { editorGutterPos, treeID: selectedTree } = teiDocument.currentTreeNode
        const highlighted = editorGutterPos === targetPos && selectedTree === treeID ? 'highlighted' : ''
        const className = `marker ${highlighted} ${markerClass}`
        const height = bottom - top 
        const markStyle = { top, height, marginLeft: columnPositions[column], ...borderStyles }
        const markKey = `gutter-mark-${index}`

        return (
            <div 
                key={markKey} 
                onClick={onClick} 
                onMouseDown={onStartDrag} 
                datanodepos={targetPos}
                style={markStyle} 
                className={className}
                >
                {this.renderName(elementID)}
            </div>
        )
    }

    renderGutterMarkers() {
        const { gutterTop, teiDocument, expanded } = this.props
        const { hard, docNodes } = teiDocument.fairCopyProject.teiSchema.elementGroups
        const { gutterMarks, totalWidth, columnPositions } = teiDocument.getGutterMarks( gutterTop, expanded )

        // turn the list of gutter mark params into rendered gutter marks
        const gutterMarkEls = gutterMarks.map( (gutterMark,index) => {
            const { pmNode, pos, top, bottom, column } = gutterMark
            const borderStyles = this.getBorderStyles(pmNode)
            const elementID = pmNode.type.name
            let style = hard.includes(elementID) || docNodes.includes(elementID) ? 'hard' : 'soft'
            if( pmNode.attrs['__error__'] ) style = style.concat(' error')

            // for split nodes, retrieve their start position, otherwise compute from offsets
            const targetPos = pos - 1
            return this.renderGutterMark(elementID, targetPos, top, bottom, index, column, style, borderStyles, columnPositions) 
        })

        return { gutterMarkEls, totalWidth }
    }

    onKeyDown = (event) => {
        const { editorView, teiDocument, onChangePos, onJumpToDrawer } = this.props
        const { editorGutterPos, treeID } = teiDocument.currentTreeNode
        const metaKey = ( event.ctrlKey || event.metaKey )

         // move structure nodes with arrow keys
         const arrowDir = event.key === 'ArrowUp' ? 'up' : event.key === 'ArrowDown' ? 'down' : event.key === 'ArrowLeft' ? 'left' : event.key === 'ArrowRight' ? 'right' : null
         if( arrowDir ) {
            if( metaKey ) {
                moveNode( arrowDir, teiDocument, editorGutterPos, event.shiftKey ) 
            } else {
                if( editorGutterPos !== null ) {
                    const { nextPos, nextPath } = navigateTree( arrowDir, editorView, editorGutterPos )
                    onChangePos(nextPos, nextPath, treeID)
                }                
            }
        }
        if( event.key === 'Enter') {
            // Move focus to the parameter drawer if a node is selected
            if( editorGutterPos !== null ) {
                onJumpToDrawer()
            }
        } 
        if( event.key === 'Backspace' || event.key === 'Delete' ) {
            eraseSelection(teiDocument)
            event.preventDefault()
        }
    }

    render() {   
        const { editorView, editorGutterPath } = this.props

        if( !editorView || !editorView.dom.parentNode || !editorView.dom.parentNode.parentNode  ) return null

        const { gutterMarkEls, totalWidth } = this.renderGutterMarkers()
        const style = { marginRight: totalWidth }

        return (
            <div className='EditorGutter'>
                <div 
                    className='markers' 
                    style={style} 
                    tabIndex={0} 
                    role="application" 
                    aria-label={editorGutterPath} 
                    aria-live="polite" 
                    aria-roledescription="document structure tree" 
                    onKeyDown={this.onKeyDown}
                >
                    { gutterMarkEls }
                </div>
            </div>
        ) 
    }
}
