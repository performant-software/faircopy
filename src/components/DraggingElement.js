import React, { Component } from 'react'

import { changeAttributes } from '../tei-document/commands'
import { addAbove, addBelow, addInside, addOutside, replaceElement, validNodeAction } from '../tei-document/editor-actions'

const hitMargin = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10
}

const positionToAction = {
  'Top': 'addAbove',
  'Bottom': 'addBelow',
  'Left': 'addOutside',
  'Right': 'addInside',
  'Center': 'replace'
}

export default class DraggingElement extends Component {

  constructor(props) {
    super(props)

    const { x: startX, y: startY } = props.startingPoint

    this.initialState = {
      nodePos: null,
      actionType: null,
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
    const { nodePos, actionType } = this.hitDetection(offsetX,offsetY)
    this.setState({ ...this.state, nodePos, actionType, offsetX, offsetY, startX, startY })
    e.preventDefault()
}

hitDetection(offsetX,offsetY) {
  const { nodePos: lastNodePos, actionType: lastActionType } = this.state

  const el = document.elementFromPoint(offsetX,offsetY)
  let nodePos = el ? parseInt(el.getAttribute('datanodepos')) : null
  nodePos = isNaN(nodePos) ? null : nodePos
  let actionType = null

  const { teiDocument, elementID } = this.props
  const editorView = teiDocument.getActiveView()
  const { doc, tr } = editorView.state

  if( lastNodePos !== null && nodePos !== lastNodePos) {
    this.clearNodeBorder(lastNodePos,doc,tr)
  }

  if( nodePos !== null ) {
    const node = doc.nodeAt(nodePos)
    if( !node.attrs['__border__'] ) {
      // determine action type and whether it is valid
      const position = this.determineBorderPosition(el,offsetX,offsetY)
      const requestedAction = positionToAction[position]
      const valid = validNodeAction( requestedAction, elementID, teiDocument, nodePos )
      actionType = valid ? requestedAction : null

      // don't update doc if state is same
      if( nodePos !== lastNodePos || actionType !== lastActionType ) {
        const borderState = `${position} ${valid}`
        const nextAttrs = { ...node.attrs, '__border__': borderState}
        const $anchor = tr.doc.resolve(nodePos)
        changeAttributes( node, nextAttrs, $anchor, tr )  
      }
    }  
  }

  if( tr.docChanged ) editorView.dispatch(tr)

  return { nodePos, actionType }
}

clearNodeBorder(pos, doc, tr) {
  const node = doc.nodeAt(pos)
  const nextAttrs = { ...node.attrs, '__border__': false}
  const $anchor = tr.doc.resolve(pos)
  changeAttributes( node, nextAttrs, $anchor, tr )
}

validateAction(actionType,nodePos) {
  const { elementID, teiDocument } = this.props
  const valid = validNodeAction( actionType, elementID, teiDocument, nodePos )
  return valid
}

determineBorderPosition(el,x,y) {
  const { top, bottom, left, right } = el.getBoundingClientRect()
  let position = 'Center'

  if( bottom-y <= hitMargin.bottom ) {
    position = 'Bottom'
  } 
  else if( y-top <= hitMargin.top ) {
    position = 'Top'
  }
  else if( x-left <= hitMargin.left ) {
    position = 'Left'
  } 
  else if( right-x <= hitMargin.right ) {
    position = 'Right'
  }

  return position
}

onDrop = () => {
  const { teiDocument, elementID, onDrop } = this.props
  const { nodePos, actionType } = this.state

  if( nodePos !== null ) {
    const editorView = teiDocument.getActiveView()
    const { doc, tr } = editorView.state
  
    // perform appropriate editor action on node
    switch( actionType ) {
      case 'addAbove':
        addAbove(elementID,teiDocument,nodePos)
        break
      case 'addBelow':
        addBelow(elementID,teiDocument,nodePos)
        break
      case 'addOutside':
        addOutside(elementID,teiDocument,nodePos)
        break
      case 'addInside':
        addInside(elementID,teiDocument,nodePos)
        break
      case 'replace':
        replaceElement(elementID,teiDocument,nodePos)
        break
      default:
    }

    this.clearNodeBorder(nodePos,doc,tr)
    editorView.dispatch(tr)
  }

  this.setState(this.initialState)
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