import React, { Component } from 'react'

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
    const { offsetX, offsetY, startX, startY } = this.state

    // calculate the new cursor position:
    const pos1 = startX - e.clientX;
    const pos2 = startY - e.clientY;
    const nextStartX = e.clientX;
    const nextStartY = e.clientY;

    // set the element's new position:
    const nextOffsetX = (offsetX - pos1)
    const nextOffsetY = (offsetY - pos2)
    this.setState({ ...this.state, offsetX: nextOffsetX, offsetY: nextOffsetY, startX: nextStartX, startY: nextStartY })

    // hit test
    const el = document.elementFromPoint(nextOffsetX,nextOffsetY)
    if( el ) console.log(`hit: ${el.nodeName} ${el.className}`)

    e.preventDefault()
}

onDrop = () => {
    const { onDrop } = this.props
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