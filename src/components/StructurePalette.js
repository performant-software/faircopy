import { Select, MenuItem, Typography } from '@material-ui/core'
import React, { Component } from 'react'

import { saveConfig, removeElementFromMenu } from '../tei-document/faircopy-config'

export default class StructurePalette extends Component {

  constructor(props) {
    super(props)

    const x = window.innerWidth - 235

    this.initialPosition = {
      dragging: false,
      startX: x,
      startY: 130,
      offsetX: x,
      offsetY: 130,
    }
    this.state = { ...this.initialPosition }
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
  const {menus} = teiDocument.fairCopyProject.fairCopyConfig
  return menus['structure']
}

renderSelectStructureGroup(menuGroups) {
  const { currentSubmenuID, onChangeMenu } = this.props

  const onChange = (e) => {
    const { value } = e.target
    onChangeMenu(value)
  }

  const menuItemEls = []
  let id = 0
  for( const menuItem of menuGroups ) {
    const { label } = menuItem
    const menuItemEl = <MenuItem key={`structure-palette-${id}`} value={id}>{label}</MenuItem>
    menuItemEls.push(menuItemEl)
    id++
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

renderElement(elementID,groupID,paletteOrder) {
  const { teiDocument } = this.props
  const { elementGroups } = teiDocument.fairCopyProject.teiSchema

  const onStartDrag = (e) => {
    const { onDragElement } = this.props
    const x = e.clientX;
    const y = e.clientY;
    const ctrlDown = (e.ctrlKey || e.metaKey)
    const target = ctrlDown ? "palette" : "document"
    
    if( target === "palette" ) {
      const {fairCopyConfig} = teiDocument.fairCopyProject 
      removeElementFromMenu( elementID, groupID, "structure", fairCopyConfig)
      saveConfig( fairCopyConfig )
    }
    onDragElement(elementID,{x, y},target)
  }

  const elType = elementGroups.hard.includes(elementID) ? 'hard' : 'soft'
  const className = `element-type ${elType}`
  return (
    <div 
        key={`structs-${paletteOrder}`}
        onMouseDown={onStartDrag} 
        datamenuid="structure"
        datamenugroupid={groupID}
        datapalettepos={paletteOrder}
        className={className}
    >
      <div className="el-name">{elementID}</div>
    </div>
  )
}

renderStructures( currentMenu, currentSubmenuID ) {
  const structureEls = []
  let paletteOrder = 0
  for( const member of currentMenu.members ) {
    const structureEl = this.renderElement(member,currentSubmenuID,paletteOrder++)
    structureEls.push(structureEl)
  }

  return structureEls
}

render() {      
    const { offsetX, offsetY, dragging } = this.state
    const { onClose, currentSubmenuID } = this.props
    
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
          { this.renderStructures(currentMenu,currentSubmenuID) }
        </div>
      </div>
    )
  }
}