import { Select, MenuItem, Typography } from '@material-ui/core'
import React, { Component } from 'react'

export default class StructurePalette extends Component {

  constructor(props) {
    super(props)

    const currentSubmenuID = "structure"
    const x = window.innerWidth - 235

    this.initialPosition = {
      dragging: false,
      startX: x,
      startY: 130,
      offsetX: x,
      offsetY: 130,
    }
    this.state = { ...this.initialPosition, currentSubmenuID }
}

componentDidMount() {
  window.addEventListener("mouseup", this.closeDragElement )
  window.addEventListener("mousemove", this.elementDrag )
  window.addEventListener("resize", this.onResize )
}

componentWillUnmount() {
  window.removeEventListener("mouseup", this.closeDragElement )
  window.removeEventListener("mousemove", this.elementDrag )
  window.removeEventListener("resize", this.onResize )
}

onResize = () => {
  const { offsetX, offsetY } = this.state
  const { nextX, nextY } = this.constrainToWindow(offsetX,offsetY)
  this.setState({ ...this.state, offsetX: nextX, offsetY: nextY })
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
    const { nextX, nextY } = this.constrainToWindow( (offsetX - pos1), (offsetY - pos2) )

    this.setState({ ...this.state, offsetX: nextX, offsetY: nextY, startX: nextStartX, startY: nextStartY })

    e.preventDefault()
  }
}

constrainToWindow( offsetX, offsetY ) {
  if( !this.el ) return { nextX: offsetX, nextY: offsetY }

  const { width, height } = this.el.getBoundingClientRect()
  const maxX = window.innerWidth - width
  const maxY = window.innerHeight - height

  let nextX, nextY  
  nextX = (offsetX < 0) ? 0 : offsetX
  nextX = nextX > maxX ? maxX : nextX
  nextY = offsetY < 0 ? 0 : offsetY
  nextY = nextY > maxY ? maxY : nextY

  return { nextX, nextY }
}

closeDragElement = () => {
  const { dragging, offsetX, offsetY } = this.state

  if( dragging ) {
    this.setState({ ...this.initialPosition, offsetX, offsetY })
  }
}

getMenuGroups() {
  const { teiDocument } = this.props
  if( !teiDocument || !teiDocument.fairCopyProject ) return null
  const menus = teiDocument.resourceType === 'header' ? teiDocument.fairCopyProject.headerMenus : teiDocument.fairCopyProject.menus
  return menus['structure']
}

renderSelectStructureGroup(menuGroups) {
  const { currentSubmenuID } = this.state

  const onChange = (e) => {
    const { value: currentSubmenuID } = e.target
    this.setState({...this.state, currentSubmenuID})
  }

  const menuItemEls = []
  for( const menuItem of Object.values(menuGroups) ) {
    const { id, label } = menuItem
    const menuItemEl = <MenuItem key={`structure-palette-${id}`} value={id}>{label}</MenuItem>
    menuItemEls.push(menuItemEl)
  }

  return (
    <Select
        name="type"
        className="select-structure-group"
        value={currentSubmenuID}
        onChange={onChange}
    >
      { menuItemEls }
    </Select>
  )
}

renderElement(elementID) {

  const onStartDrag = () => {
    const { onDragElement } = this.props
    onDragElement(elementID,{ x: 500, y: 500})
  }

  return (
    <div 
        key={`structs-${elementID}`}
        onMouseDown={onStartDrag} 
        className="element-type"
    >
      <div className="el-name">{elementID}</div>
    </div>
  )
}

renderStructures( currentMenu ) {
  const structureEls = []
  for( const member of currentMenu.members ) {
    const structureEl = this.renderElement(member.id)
    structureEls.push(structureEl)
  }

  return structureEls
}

render() {      
    const { offsetX, offsetY, dragging, currentSubmenuID } = this.state
    const { onClose } = this.props
    
    const menuGroups = this.getMenuGroups()
    if( !menuGroups ) return null

    const currentMenu = menuGroups[currentSubmenuID]
  
    const style = {
      left: offsetX,
      top: offsetY,
      pointerEvents: dragging ? 'none' : 'auto' 
    }

    const onRef = (el) => {
      this.el = el
    }

    return (
      <div 
        id="StructurePalette"
        style={style}
        ref={onRef} 
      >
        <div className="close-x" onClick={onClose}><i className="fas fa-times fa-sm"></i></div>
        <div className="header" onMouseDown={this.dragMouseDown}>
          <Typography><i className="fas fa-palette fa-sm"></i><span className="title">Elements</span></Typography>
        </div>
        <div className="content">
          { this.renderSelectStructureGroup(menuGroups) }
          { this.renderStructures(currentMenu) }
        </div>
      </div>
    )
  }
}