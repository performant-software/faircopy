import { Button, Typography } from '@material-ui/core'
import React, { Component } from 'react'

export default class StructurePalette extends Component {

  constructor(props) {
    super(props)

    this.initialState = {
      dragging: false,
      startX: 500,
      startY: 500,
      offsetX: 500,
      offsetY: 500
    }
    this.state = this.initialState
}

componentDidMount() {
  window.addEventListener("mouseup", this.closeDragElement )
  window.addEventListener("mousemove", this.elementDrag )
}

componentWillUnmount() {
  window.removeEventListener("mouseup", this.closeDragElement )
  window.removeEventListener("mousemove", this.elementDrag )
}

dragMouseDown = (e) => {
  const { dragging } = this.state

  if( !dragging ) {
    // get the mouse cursor position at startup:
    const startX = e.clientX;
    const startY = e.clientY;

    this.setState({...this.state, startX, startY, dragging: true })
  }
}

elementDrag = (e) => {
  const { offsetX, offsetY, startX, startY, dragging } = this.state

  if( dragging ) {
    // calculate the new cursor position:
    const pos1 = startX - e.clientX;
    const pos2 = startY - e.clientY;
    const nextStartX = e.clientX;
    const nextStartY = e.clientY;

    // set the element's new position:
    const nextOffsetX = (offsetX - pos1)
    const nextOffsetY = (offsetY - pos2)
    this.setState({ ...this.state, offsetX: nextOffsetX, offsetY: nextOffsetY, startX: nextStartX, startY: nextStartY })

    e.preventDefault()
  }
}

closeDragElement = () => {
  const { dragging, offsetX, offsetY } = this.state

  if( dragging ) {
    this.setState({ ...this.initialState, offsetX, offsetY })
  }
}

renderElement(elementID) {

  const onStartDrag = () => {
    const { onDragElement } = this.props
    onDragElement(elementID,{ x: 500, y: 500})
  }

  return (
    <div 
        onMouseDown={onStartDrag} 
        className="element-type"
        >
        <div className="el-name">{elementID}</div>
    </div>
  )
}

render() {      
    const { offsetX, offsetY, dragging } = this.state
    const { onClose } = this.props
  
    const style = {
      left: offsetX,
      top: offsetY,
      pointerEvents: dragging ? 'none' : 'auto' 
    }

    return (
      <div 
        style={style}
        id="StructurePalette"
      >
        <div className="close-x" onClick={onClose}><i className="fas fa-times fa-sm"></i></div>
        <div className="header" onMouseDown={this.dragMouseDown}>
          <Typography>Structure Elements</Typography>
        </div>
        <div className="content">
          { this.renderElement('p') }
          { this.renderElement('ab') }
          { this.renderElement('div') }
          <Button className="add-button" size="small" variant="outlined">Add Element</Button>
        </div>
      </div>
    )
  }
}