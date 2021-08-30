import React, { Component } from 'react'
import { NodeSelection } from "prosemirror-state"

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

    renderGutterMark(elementID,targetPos,top,bottom,index,column,markerClass,borderStyles,columnPositions) {
     
        const onClick = () => {
            const { editorView } = this.props
            const editorState = editorView.state
            const {tr,doc} = editorState
            tr.setSelection( NodeSelection.create(doc,targetPos) )
            editorView.dispatch(tr)
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

        const { editorView } = this.props
        const highlighted = editorView.state.selection.from === targetPos ? 'highlighted' : ''
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

    obtainSamplePos() {
        const { editorView } = this.props
        let samplePos = null
        // TODO calculate the start point
        let left = 600, top = 300
        // if we don't find a sample at first, scan diagonally down the page till we find one
        // TODO needs to halt if it gets off screen
        while( samplePos === null ) {
            const sample = editorView.posAtCoords({ left, top })
            if( sample ) console.log(`sample ${sample.pos} ${sample.inside} ${left} ${top}`)
            samplePos = (sample && sample.inside !== -1) ? sample.pos : null  
            left+=10
            top+=10
            if( top > 10000 ) return null
        }
        return samplePos
    }

    renderGutterMarkers() {
        const { editorView, gutterTop, teiDocument, expanded } = this.props
        const { doc } = editorView.state
        const { hard, docNodes } = teiDocument.fairCopyProject.teiSchema.elementGroups

        const scrollTop = editorView.dom.parentNode.parentNode.scrollTop

        // recursively build subtree of visible structure nodes from slice
        const processNode = (pmNode,pos=0) => {
            const children = []
            const nodeType = pmNode.type ? pmNode.type.name : 'root'
            let top = null, bottom = null

            if( nodeType.startsWith('textNode') || nodeType.startsWith('globalNode') ) {
                top = editorView.coordsAtPos(pos).top - gutterTop+scrollTop-5
                bottom = editorView.coordsAtPos(pos+pmNode.nodeSize-1).bottom - gutterTop+scrollTop-5   
            }

            let offset = 1
            for( let i=0; i < pmNode.childCount; i++ ) {
                const pmChildNode = pmNode.child(i)
                const childPos = pos+offset
                if( pmChildNode.type.isBlock ) {
                    children.push( processNode(pmChildNode,childPos) )
                } 
                offset += pmChildNode.nodeSize
            }    

            return {
                pmNode,
                pos,
                top,
                bottom,
                children
            }
        }
        
        // turn the PM slice into a tree with screen positions
        const subTree = processNode(doc)

        const gutterMarks = []
        const columnPositions = []
        const computedWidths = {}
        const canvas = document.createElement("canvas")

        function getTextWidth(text) {
            if( !computedWidths[text] ) {
                const context = canvas.getContext("2d")
                // must match CSS for: .EditorGutter .markers
                context.font = "12pt sans-serif"
                const metrics = context.measureText(text)
                const width = Math.floor(metrics.width)    
                computedWidths[text] = width
                return width
            } else {
                // return cached value
                return computedWidths[text]
            }
        }

        const columnThickness = []

        // find the max width for each column
        // TODO optimize w/cache
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
        
        const processGutterMarks = (node,column=-1) => {
            const { pmNode, top, bottom, children } = node
            const nodeType = pmNode.type ? pmNode.type.name : 'root'
            
            if( top !== null ) {
                return {top, bottom}
            } else {
                for( let i=0; i < children.length; i++ ) {
                    const child = children[i]
                    const { top: childTop, bottom: childBottom } = processGutterMarks(child,column+1)
                    child.top = childTop
                    child.bottom = childBottom
                    if( i > 0 ) children[i-1].bottom = childTop - 10
                }

                const first = children[0]               
                if( first ) {
                    // filter out elements that don't appear in gutter, add remaining details and place in render list
                    if( pmNode.type.isBlock && !docNodes.includes(nodeType) && !nodeType.startsWith('textNode') && !nodeType.startsWith('globalNode') ) {
                        gatherColumnThickness(nodeType,column)
                        node.column = column        
                        gutterMarks.push(node)
                    }
                    const last = children[children.length-1]
                    return { top: first.top, bottom: last.bottom }
                } else {
                    // element has no children and therefore no height, don't add it to gutterMarks
                    return { top, bottom }
                }
            }    
        }

        // turn the tree into a flat list of gutter marks to render
        processGutterMarks(subTree)

        // once the max column width is known, calculate column positions
        let totalWidth = 0
        for( let i=0; i < columnThickness.length; i++ ) {
            columnPositions[i] = totalWidth  
            totalWidth += columnThickness[i]
        }

        // turn the list of gutter mark params into rendered gutter marks
        const gutterMarkEls = gutterMarks.map( (gutterMark,index) => {
            const { pmNode, pos, top, bottom, column } = gutterMark
            const borderStyles = this.getBorderStyles(pmNode)
            const elementID = pmNode.type.name
            const style = hard.includes(elementID) || docNodes.includes(elementID) ? 'hard' : 'soft'
            // for split nodes, retrieve their start position, otherwise compute from offsets
            const targetPos = pos - 1
            return this.renderGutterMark(elementID, targetPos, top, bottom, index, column, style, borderStyles, columnPositions) 
        })

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
