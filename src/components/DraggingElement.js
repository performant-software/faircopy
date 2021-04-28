import React, { Component } from 'react'
import { changeAttributes } from '../tei-document/commands'

const hitMargin = 10

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

hitDetection = (offsetX,offsetY) => {
  const { nodePos: lastNodePos } = this.state

  const el = document.elementFromPoint(offsetX,offsetY)
  let nodePos = el ? parseInt(el.getAttribute('datanodepos')) : null
  nodePos = isNaN(nodePos) ? null : nodePos

  if( nodePos === lastNodePos ) return nodePos

  const { teiDocument } = this.props
  const editorView = teiDocument.getActiveView()
  const { doc, tr } = editorView.state

  if( lastNodePos !== null ) {
    this.clearNodeBorder(lastNodePos,doc,tr)
  }

  if( nodePos !== null ) {
    const node = doc.nodeAt(nodePos)
    if( !node.attrs['__border__'] ) {
      const borderState = this.determineBorderState(el,offsetX,offsetY)
      const nextAttrs = { ...node.attrs, '__border__': borderState}
      const $anchor = tr.doc.resolve(nodePos)
      changeAttributes( node, nextAttrs, $anchor, tr )
    }  
  }

  if( tr.docChanged ) editorView.dispatch(tr)

  return nodePos
}

clearNodeBorder(pos, doc, tr) {
  const node = doc.nodeAt(pos)
  const nextAttrs = { ...node.attrs, '__border__': false}
  const $anchor = tr.doc.resolve(pos)
  changeAttributes( node, nextAttrs, $anchor, tr )
}

determineBorderState(el,x,y) {

  const { top, bottom, left, right } = el.getBoundingClientRect()
  let position = 'Center'

  if( bottom-y <= hitMargin ) {
    position = 'Bottom'
  } 
  else if( y-top <= hitMargin ) {
    position = 'Top'
  }
  else if( x-left <= hitMargin ) {
    position = 'Left'
  } 
  else if( right-x <= hitMargin ) {
    position = 'Right'
  }

  // TODO determine status
  const status = 'green'

  return `${position} ${status}`
}

onDrop = () => {
  const { teiDocument, onDrop } = this.props
  const { nodePos } = this.state

  const editorView = teiDocument.getActiveView()
  const { doc, tr } = editorView.state

  if( nodePos !== null ) {
    this.clearNodeBorder(nodePos,doc,tr)
    editorView.dispatch(tr)
    this.setState(this.initialState)
  }
  
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