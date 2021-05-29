import React, { Component } from 'react'

import { changeAttributes } from '../tei-document/commands'
import { validNodeAction, createStructureElement } from '../tei-document/editor-actions'
import { addElementToMenu, saveConfig } from '../tei-document/faircopy-config'

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
      menuID: null,
      groupID: null,
      palettePos: null,
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
    const hitData = this.hitDetection(offsetX,offsetY)
    this.setState({ ...this.state, ...hitData, offsetX, offsetY, startX, startY })
    e.preventDefault()
}

hitDetection(offsetX,offsetY) {
  const { nodePos: lastNodePos, actionType: lastActionType } = this.state

  const el = document.elementFromPoint(offsetX,offsetY)

  if( !el || !el.className ) {
    return { nodePos: lastNodePos, actionType: lastActionType }
  }

  let nodePos = parseInt(el.getAttribute('datanodepos'))
  nodePos = isNaN(nodePos) ? null : nodePos
  
  let actionType = null
  let menuID = null
  let groupID = null
  let palettePos = null

  const { teiDocument, elementID, dragSource } = this.props
  const editorView = teiDocument.getActiveView()
  const { doc, tr } = editorView.state

  if( lastNodePos !== null && nodePos !== lastNodePos) {
    this.clearNodeBorder(lastNodePos,doc,tr)
  }

  if( nodePos !== null && dragSource === 'palette-copy' ) {
    // determine action type and whether it is valid
    const node = doc.nodeAt(nodePos)
    const position = this.determineBorderPosition(el,offsetX,offsetY)
    const requestedAction = positionToAction[position]
    const valid = validNodeAction( requestedAction, elementID, teiDocument, nodePos )
    actionType = valid ? requestedAction : null

    const borderState = `${position} ${valid}`
    const nextAttrs = { ...node.attrs, '__border__': borderState}
    const $anchor = tr.doc.resolve(nodePos)
    tr.setMeta('addToHistory',false)
    changeAttributes( node, nextAttrs, $anchor, tr )  
  } else if( dragSource === 'gutter-copy' ) {
    menuID = el.getAttribute('datamenuid')
    groupID = parseInt(el.getAttribute('datamenugroupid'))
    groupID = isNaN(groupID) ? null : groupID
    palettePos = parseInt(el.getAttribute('datapalettepos'))
    palettePos = isNaN(palettePos) ? null : palettePos
  }

  if( tr.docChanged ) editorView.dispatch(tr)

  return { nodePos, actionType, menuID, groupID, palettePos }
}

clearNodeBorder(pos, doc, tr) {
  const node = doc.nodeAt(pos)
  const nextAttrs = { ...node.attrs, '__border__': false}
  const $anchor = tr.doc.resolve(pos)
  tr.setMeta('addToHistory',false)
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
  const { teiDocument, elementID, onDrop, dragSource } = this.props
  const { nodePos, actionType, menuID, groupID, palettePos } = this.state

  if( nodePos !== null && dragSource === 'palette-copy' ) {
    const editorView = teiDocument.getActiveView()
    let tr = editorView.state.tr
    this.clearNodeBorder(nodePos,tr.doc,tr)
    if( actionType ) {
      tr = createStructureElement( elementID, nodePos, actionType, teiDocument, tr )
    }
    editorView.dispatch(tr)
  } 
  else if( menuID && dragSource === 'gutter-copy' ) {
    const {fairCopyConfig} = teiDocument.fairCopyProject 
    addElementToMenu( elementID, palettePos, groupID, menuID, fairCopyConfig)
    saveConfig( fairCopyConfig )
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