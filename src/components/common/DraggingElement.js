import { Typography } from '@material-ui/core'
import React, { Component } from 'react'

const dragThreshold = 5

export default class DraggingElement extends Component {

  constructor(props) {
    super(props)

    this.baseState = {
      x: null,
      y: null
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
    const { onDraggedAway } = this.props
    const { x: currentX } = this.state
    const { x: offsetX, y: offsetY } = this.props.clientOffset
    const { x: startX, y: startY } = this.props.startingPoint
    const x = e.clientX-offsetX
    const y = e.clientY-offsetY

    // don't start dragging until the drag threshold is reached
    if( currentX !== null || distance(startX,startY,x,y) > dragThreshold ) {
      const hitData = this.hitDetection(e.clientX,e.clientY)
      this.setState({ ...this.state, ...hitData, x, y })  
      if( currentX === null ) onDraggedAway()
    } 

    e.preventDefault()
}

render() {      
    const { elementID } = this.props
    const { x, y } = this.state

    // hasn't moved yet
    if( x === null ) return null
  
    const style = {
      left: x,
      top: y
    }

    return (
      <div 
        id="DraggingElement"
        style={style}
      >
        <div className="el-name"><Typography>{elementID}</Typography></div>
      </div>
    )
  }
}

function distance(x1,y1,x2,y2) {
  const a = x1 - x2;
  const b = y1 - y2;
  return Math.sqrt( a*a + b*b );
}