import React, { Component } from 'react'
import { debounce } from "debounce"
import { changeAttributes } from '../tei-document/commands'

const hitDetectionInterval = 20

export default class DraggingElement extends Component {

  constructor(props) {
    super(props)

    const { x: startX, y: startY } = props.startingPoint

    this.initialState = {
      startX,
      startY,
      offsetX: startX,
      offsetY: startY
    }
    this.state = this.initialState

    this.hitDetection = debounce( this.__hitDetection, hitDetectionInterval)
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
    const { offsetX: prevOffsetX, offsetY: prevOffsetY, startX, startY } = this.state

    // calculate the new cursor position:
    const pos1 = startX - e.clientX;
    const pos2 = startY - e.clientY;
    const nextStartX = e.clientX;
    const nextStartY = e.clientY;

    // set the element's new position:
    const offsetX = (prevOffsetX - pos1)
    const offsetY = (prevOffsetY - pos2)
    this.setState({ ...this.state, offsetX, offsetY, startX: nextStartX, startY: nextStartY })
    this.hitDetection(offsetX,offsetY)
    e.preventDefault()
}

// is called by the debounced fn() defined in constructor
__hitDetection = (offsetX,offsetY) => {
  const el = document.elementFromPoint(offsetX,offsetY)
  const nodePos = parseInt(el.getAttribute('datanodepos'))

  if( !isNaN(nodePos) ) {
    const { teiDocument } = this.props
    const editorView = teiDocument.getActiveView()
    const { doc, tr } = editorView.state
    const node = doc.nodeAt(nodePos)

    if( !node.attrs['__border__'] ) {
      const nextAttrs = { ...node.attrs, '__border__': 'Right green'}
      const $anchor = tr.doc.resolve(nodePos)
      changeAttributes( node, nextAttrs, $anchor, tr )
      editorView.dispatch(tr)         
    }
  }
}

onDrop = () => {
  // const { offsetX, offsetY } = this.state
  // const { elementID, teiDocument, onDrop } = this.props
  const { onDrop } = this.props

  // hit test
  // const el = document.elementFromPoint(offsetX,offsetY)
  // if( el ) console.log(`hit: ${el.nodeName} ${el.className}`)

  // map bar to node
  // perform action on node

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