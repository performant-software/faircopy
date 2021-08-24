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

    renderGutterMark(node,targetPos,top,bottom,index,column,style,columnPositions) {
        const { editorView } = this.props
        const editorState = editorView.state

        const height = bottom - top 
        const borderStyles = this.getBorderStyles(node)
        const markStyle = { top, height, marginLeft: columnPositions[column], ...borderStyles }
        const markKey = `gutter-mark-${index}`
        const highlighted = editorView.state.selection.node === node ? 'highlighted' : ''
        const className = `marker ${highlighted} ${style}`
        const elementID = node.type.name

        const onClick = () => {
            const {tr,doc} = editorState
            tr.setSelection( new NodeSelection(doc.resolve(targetPos-1)) )
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

        return (
            <div 
                key={markKey} 
                onClick={onClick} 
                onMouseDown={onStartDrag} 
                datanodepos={targetPos-1}
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

        // wrap with the open nodes, if any
        if( viewSlice.openStart > 0 ) {
            const $startPos = doc.resolve(startPos)
            let i = viewSlice.openStart
            while(i > 0) {
                const node = $startPos.node(i--)
                viewFrag = Fragment.from( node.copy(viewFrag) )
            }
        }
        
        // build subtree of visible structure nodes
        const processNode = (pmNode,pos=0) => {
            const children = []
            const nodeType = pmNode.type ? pmNode.type.name : 'root'
            let top = null, bottom = null

            if( !nodeType.includes('textNode') && !nodeType.includes('globalNode') ) {
                let offset = 1
                for( let i=0; i < pmNode.childCount; i++ ) {
                    const pmChildNode = pmNode.child(i)
                    const childPos = pos+offset
                    children.push( processNode(pmChildNode,childPos) )
                    offset += pmChildNode.nodeSize
                }    
            } else {
                top = editorView.coordsAtPos(pos+startPos).top - gutterTop + scrollTop - 5
                bottom = editorView.coordsAtPos(pos+startPos+pmNode.nodeSize-1).bottom - gutterTop + scrollTop - 5
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
            const { top, bottom, children } = node

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

                if( node.pmNode.type ) {
                    const {name} = node.pmNode.type
                    gatherColumnThickness(name,column)
                    node.style = hard.includes(name) || docNodes.includes(name) ? 'hard' : 'soft'
                    node.column = column                    
                    flattened.push(node)
                }
                const first = children[0]
                const last = children[children.length-1]
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
            // console.log(`${pmNode.type.name}: ${top} ${bottom}`)
            return this.renderGutterMark(pmNode, pos, top, bottom, index, column, style, columnPositions) 
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
