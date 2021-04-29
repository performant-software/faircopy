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

  if( !el.className ) {
    return { nodePos: lastNodePos, actionType: lastActionType }
  }

  let nodePos = parseInt(el.getAttribute('datanodepos'))
  nodePos = isNaN(nodePos) ? null : nodePos
  let actionType = null

  const { teiDocument, elementID } = this.props
  const editorView = teiDocument.getActiveView()
  const { doc, tr } = editorView.state

  if( lastNodePos !== null && nodePos !== lastNodePos) {
    this.clearNodeBorder(lastNodePos,doc,tr)
  }

  if( nodePos !== null ) {
    // determine action type and whether it is valid
    const node = doc.nodeAt(nodePos)
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

  if( tr.docChanged ) editorView.dispatch(tr)

  console.log(`ondrag ${nodePos} ${actionType} ${el} ${el.className}`)

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

  console.log(`ondrop ${nodePos} ${actionType}`)

  if( nodePos !== null ) {
    const editorView = teiDocument.getActiveView()
    let tr = null
    
    // perform appropriate editor action on node
    switch( actionType ) {
      case 'addAbove':
        tr = addAbove(elementID,teiDocument,nodePos)
        break
      case 'addBelow':
        tr = addBelow(elementID,teiDocument,nodePos)
        break
      case 'addOutside':
        tr = addOutside(elementID,teiDocument,nodePos)
        break
      case 'addInside':
        tr = addInside(elementID,teiDocument,nodePos)
        break
      case 'replace':
        tr = replaceElement(elementID,teiDocument,nodePos)
        break
      default:
        tr = editorView.state.tr
    }

    this.clearNodeBorder(nodePos,tr.doc,tr)

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