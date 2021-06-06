import React, { Component } from 'react'

export default class DraggingElement extends Component {

  constructor(props) {
    super(props)

    const { x: startX, y: startY } = props.startingPoint

    this.baseState = {
      startX,
      startY,
      offsetX: startX,
      offsetY: startY
    }
}

onDrop(e) {
  throw new Error('onDrop() is a pure virtual function, implement it in a child class.')
}

hitDetection(offsetX,offsetY) {
  throw new Error('hitDetection() is a pure virtual function, implement it in a child class.')
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