import React, { Component } from 'react'
import { changeAttributes } from '../tei-document/commands'

export default class DraggingElement extends Component {

  constructor(props) {
    super(props)

    const { x: startX, y: startY } = props.startingPoint

    this.initialState = {
      nodePos: null,
      startX,
      startY,
      offsetX: startX,
      offsetY: startY
    }
    this.state = this.initialState
}

componentDidMount() {
  window.addEventListener("mouseup", this.onDrop )
  window.addEventListener("mousemove", this.elementDrag )
}

componentWillUnmount() {
  window.removeEventListener("mouseup", this.onDrop )
  window.removeEventListener("mousemove", this.elementDrag )
}

elementDrag = (e) => {
    const { offsetX: prevOffsetX, offsetY: prevOffsetY, startX: prevStartX, startY: prevStartY } = this.state

    // calculate the new cursor position:
    const pos1 = prevStartX - e.clientX;
    const pos2 = prevStartY - e.clientY;
    const startX = e.clientX;
    const startY = e.clientY;

    // set the element's new position:
    const offsetX = (prevOffsetX - pos1)
    const offsetY = (prevOffsetY - pos2)
    const nodePos = this.hitDetection(offsetX,offsetY)
    this.setState({ ...this.state, nodePos, offsetX, offsetY, startX, startY })
    e.preventDefault()
}

// is called by the debounced fn() defined in constructor
hitDetection = (offsetX,offsetY) => {
  const { nodePos: lastNodePos } = this.state

  const el = document.elementFromPoint(offsetX,offsetY)
  const nodePos = el ? parseInt(el.getAttribute('datanodepos')) : null

  if( nodePos === lastNodePos ) return nodePos

  const { teiDocument } = this.props
  const editorView = teiDocument.getActiveView()
  const { doc, tr } = editorView.state

  if( !isNaN(nodePos) ) {
    const node = doc.nodeAt(nodePos)
    if( !node.attrs['__border__'] ) {
      const borderState = this.determineBorderState(el,offsetX,offsetY)
      const nextAttrs = { ...node.attrs, '__border__': borderState}
      const $anchor = tr.doc.resolve(nodePos)
      changeAttributes( node, nextAttrs, $anchor, tr )
      editorView.dispatch(tr)         
    }
    return nodePos
  } else {
    // TODO implement a stack for lastNodePos
    if( lastNodePos !== null ) {
      const node = doc.nodeAt(lastNodePos)
      const nextAttrs = { ...node.attrs, '__border__': false}
      const $anchor = tr.doc.resolve(lastNodePos)
      changeAttributes( node, nextAttrs, $anchor, tr )
      editorView.dispatch(tr)         
    }
    return null  
  }
}

determineBorderState(el,offsetX,offsetY) {
  // TODO determine Left,Right,Top,Bottom,Center
  const position = 'Right'

  // TODO determine status
  const status = 'green'

  return `${position} ${status}`
}

onDrop = () => {
  const { onDrop } = this.props
  // TODO perform appropriate editor action on node
  onDrop()
}

render() {      
    const { elementID } = this.props
    const { offsetX, offsetY } = this.state
  
    const style = {
      left: offsetX,
      top: offsetY
    }

    return (
      <div 
        id="DraggingElement"
        style={style}
      >
        <div className="el-name">{elementID}</div>
      </div>
    )
  }
}