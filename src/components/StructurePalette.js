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
    this.setState({ ...this.initialPosition, offsetX, offsetY })
  }
}

getMenuGroups() {
  const { teiDocument } = this.props
  if( !teiDocument ) return null
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
    const currentMenu = menuGroups[currentSubmenuID]
  
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
          <Typography>Elements</Typography>
        </div>
        <div className="content">
          { this.renderSelectStructureGroup(menuGroups) }
          { this.renderStructures(currentMenu) }
        </div>
      </div>
    )
  }
}