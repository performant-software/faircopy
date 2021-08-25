import React, { Component } from 'react'
import { NodeSelection } from "prosemirror-state"
import { Fragment } from "prosemirror-model"

const viewportSize = 10000

export default class EditorGutter2 extends Component {

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
            console.log(`clicked on position: ${targetPos}`)
            tr.setSelection( NodeSelection.create(doc,targetPos) )
            editorView.dispatch(tr)
        }

        const onStartDrag = (e) => {
            const ctrlDown = (e.ctrlKey || e.metaKey)
            const { onDragElement } = this.props
            console.log('entered drag')

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

    renderGutterMarkers() {
        const { editorView, gutterTop, scrollTop, teiDocument, expanded } = this.props
        const { doc } = editorView.state
        const { hard, docNodes } = teiDocument.fairCopyProject.teiSchema.elementGroups
        const canvas = document.createElement("canvas")

        // TODO find a starting text node
        let centerPos = Math.min( Math.floor(scrollTop/editorView.dom.clientHeight * doc.content.size), doc.content.size-1)      

        // const viewportSample = editorView.posAtCoords({ left: editorView.dom.innerWidth, top: window.innerHeight/2 })
        // const centerPos = viewportSample.pos
        const startPos = centerPos-(viewportSize/2) > 0 ? centerPos-(viewportSize/2) : 0
        const endPos = centerPos+(viewportSize/2) <= doc.content.size-1 ? centerPos+(viewportSize/2) : doc.content.size-1

        const viewSlice = doc.slice(startPos,endPos)
        let viewFrag = viewSlice.content
        let viewFragOffset = startPos

        // wrap with the open nodes, if any
        if( viewSlice.openStart > 0 ) {
            const $startPos = doc.resolve(startPos)
            let i = viewSlice.openStart
            while(i > 0) {
                const node = $startPos.node(i--)
                viewFrag = Fragment.from( node.copy(viewFrag) )
                viewFragOffset--
            }
        }
        // build subtree of visible structure nodes
        const processNode = (pmNode,pos=0) => {
            const children = []
            const nodeType = pmNode.type ? pmNode.type.name : 'root'
            let top = null, bottom = null

            if( nodeType.startsWith('textNode') || nodeType.startsWith('globalNode') ) {
                top = editorView.coordsAtPos(pos+viewFragOffset).top - gutterTop + scrollTop - 5
                bottom = editorView.coordsAtPos(pos+viewFragOffset+pmNode.nodeSize-1).bottom - gutterTop + scrollTop - 5            
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
        
        // turn PM nodes into gutter mark properties
        const subTree = processNode(viewFrag)

        const flattened = []
        const columnPositions = []

        function getTextWidth(text) {
            const context = canvas.getContext("2d")
            // must match CSS for: .EditorGutter .markers
            context.font = "12pt sans-serif"
            const metrics = context.measureText(text)
            return Math.floor(metrics.width)
        }

        const columnThickness = []

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

                // filter out elements that don't appear in gutter, add remaining details and place in render list
                if( nodeType !== 'root' && pmNode.type.isBlock && !nodeType.startsWith('textNode') && !nodeType.startsWith('globalNode') ) {
                    gatherColumnThickness(nodeType,column)
                    node.style = hard.includes(nodeType) || docNodes.includes(nodeType) ? 'hard' : 'soft'
                    node.column = column        
                    flattened.push(node)
                }
                const first = children[0]
                const last = children[children.length-1]
                if( !first ) debugger
                return { top: first.top, bottom: last.bottom }
            }    
        }

        processGutterMarks(subTree)

        // once the max column width is known, calculate column positions
        let totalWidth = 0
        for( let i=0; i < columnThickness.length; i++ ) {
            columnPositions[i] = totalWidth  
            totalWidth += columnThickness[i]
        }

        // render the components 
        const gutterMarkEls = flattened.map( (node,index) => {
            const { pmNode, pos, top, bottom, column, style } = node
            const borderStyles = this.getBorderStyles(pmNode)
            const elementID = pmNode.type.name
            const targetPos = pos + viewFragOffset - 1
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
