import { Select, MenuItem, Typography } from '@material-ui/core'
import React, { Component } from 'react'
import EmptyGroup from './EmptyGroup'
import ElementInfoPopup from './ElementInfoPopup'
import { determineRules, createStructureElement } from '../../../model/editor-actions'
import { validNodeAction } from '../../../model/element-validators'
import { getElementIcon } from '../../../model/TEISchema'

const clientOffset = { x: 0, y: 0 }
const bottomMargin = 50

export default class StructurePalette extends Component {

  constructor(props) {
    super(props)

    const x = window.innerWidth - 300 - props.leftPaneWidth

    this.initialPosition = {
      dragging: false,
      startX: x,
      startY: 130,
      offsetX: x,
      offsetY: 130,
      elementInfoID: null
    }
    this.itemEls = {}

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
  const maxY = window.innerHeight - height - bottomMargin

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

getValidSubMenuID(menuGroups,subMenuID) {
  if( menuGroups.length-1 >= subMenuID ) {
    return 0
  } else {
    return subMenuID
  }
}

renderElementInfo() {
  const { teiDocument } = this.props
  const { elementInfoID } = this.state

  const anchorEl = this.itemEls[elementInfoID]

  if( !elementInfoID || !anchorEl ) return null

  const { teiSchema } = teiDocument.fairCopyProject
  const { elements } = teiSchema
  const elementSpec = elements[elementInfoID]

  if(!elementSpec) return null
  
  const rules = determineRules( elementInfoID, teiSchema )
  return (
      <ElementInfoPopup
          elementSpec={elementSpec}
          containedBy={rules.containedBy}
          mayContain={rules.mayContain}
          notes={rules.notes}
          anchorEl={()=>{ return this.itemEls[elementInfoID]}}        
      ></ElementInfoPopup>
  )
}

renderSelectStructureGroup(menuGroups, subMenuID) {
  const { onChangeMenu } = this.props

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
        value={subMenuID}
        autoFocus={true}
        onChange={onChange}
    >
      { menuItemEls }
    </Select>
  )
}

renderElement(elementID,groupID,paletteOrder) {
  const { teiDocument } = this.props
  const { teiSchema } = teiDocument.fairCopyProject
  const { elementGroups } = teiSchema

  const onStartDrag = (e) => {
    const { onDragElement } = this.props
    const startingPoint = { x: e.clientX-clientOffset.x, y: e.clientY-clientOffset.y }
    this.setState({ ...this.state, elementInfoID: null })
    this.itemEls[elementID].focus()
    onDragElement(elementID,clientOffset,startingPoint,"document")
  }

  const onMouseOver = () => { 
    if( !this.state.dragging ) this.setState({ ...this.state, elementInfoID: elementID })
  }
  const onFocus = () => {
    if( !this.state.dragging ) this.setState({ ...this.state, elementInfoID: elementID })
  }
  const onMouseLeave = () => { this.setState({ ...this.state, elementInfoID: null })}
  const onBlur = () => {
    if( !this.state.dragging ) this.setState({ ...this.state, elementInfoID: null })
  }

  const setItemElRef = (el) => {
    this.itemEls[elementID] = el
  }

  const elType = elementGroups.hard.includes(elementID) ? 'hard' : 'soft'
  const className = `element-type ${elType}`
  const icon = getElementIcon(elementID, teiSchema.elements)
  const elementIcon = icon ? <i className={`${icon} fa-sm element-icon`}></i> : null

  return (
    <div 
        key={`structs-${paletteOrder}`}
        ref={setItemElRef}
        onMouseDown={onStartDrag} 
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        datamenuid="structure"
        datamenugroupid={groupID}
        datapalettepos={paletteOrder}
        className={className}
        tabIndex={0}
    >
      <div className="el-name">{elementIcon}{elementID}</div>
    </div>
  )
}

renderStructures( currentMenu, currentSubmenuID ) {
  const structureEls = []

  if( currentMenu.members.length === 0 ) {
    const {onProjectSettings} = this.props
    structureEls.push(<EmptyGroup key="empty-group" onProjectSettings={onProjectSettings}></EmptyGroup>)
  } else {
    let paletteOrder = 0
    for( const member of currentMenu.members ) {
      const structureEl = this.renderElement(member,currentSubmenuID,paletteOrder++)
      structureEls.push(structureEl)
    }  
  }

  return structureEls
}

getCurrentMenu() {
  const { currentSubmenuID } = this.props  
  const menuGroups = this.getMenuGroups()
  if( !menuGroups ) return { menuGroups: null }

  // if the list of groups changed length out from under subMenuID
  const validSubMenuID = ( menuGroups.length-1 >= currentSubmenuID ) ? currentSubmenuID : 0
  return { currentMenuID: validSubMenuID, menuGroups }
}

close() {
  const { onClose } = this.props
  const { teiDocument } = this.props
  const editorView = teiDocument.getActiveView()
  editorView.focus()
  onClose()
}

onKeyDown = (event) => {
  const { teiDocument, onAlertMessage } = this.props
  const { activeElement } = document
  const palettePos = activeElement.getAttribute('datapalettepos')
  const elementIndex = palettePos ? parseInt(palettePos) : null
  const { currentMenuID, menuGroups } = this.getCurrentMenu()
  const keyCode = event.key
  const metaKey = ( event.ctrlKey || event.metaKey )

  if( keyCode === 'Escape' ) {
    this.close()
  }
  else if( elementIndex !== null && menuGroups !== null ) {
    const currentMenu = menuGroups[currentMenuID]
    const elementID = currentMenu.members[elementIndex]
    const editorView = teiDocument.getActiveView()
    let { tr } = editorView.state

    const { editorGutterPos } = teiDocument.currentTreeNode

    if( keyCode === 'Enter' ) {
      if( editorGutterPos !== null ) {
        if( validNodeAction('replace', elementID, teiDocument, editorGutterPos) ) {
          tr = createStructureElement( elementID, editorGutterPos, 'replace', teiDocument, tr )
          editorView.dispatch(tr)
        } else {
          onAlertMessage(`Cannot replace selected element with ${elementID}.`)
        }  
      }
    } else if( metaKey ) {
      if( editorGutterPos !== null ) {
        let actionType = null, position = null
        switch( keyCode ) {
          case 'ArrowUp':
            position = 'above'
            actionType = 'addAbove'
            break
          case 'ArrowDown':
            position = 'below'
            actionType = 'addBelow'
            break
          case 'ArrowLeft':
            position = 'outside'
            actionType = 'addOutside'
            break
          case 'ArrowRight':
            position = 'inside'
            actionType = 'addInside'
            break
          default:
        }

        if( actionType && validNodeAction(actionType, elementID, teiDocument, editorGutterPos)) {
            tr = createStructureElement( elementID, editorGutterPos, actionType, teiDocument, tr )
            editorView.dispatch(tr)
        } else {
            if(position) onAlertMessage(`Cannot add ${elementID} ${position} the selected element.`)
        }
      }
    } else {
      const currentMenu = menuGroups[currentMenuID]
      const maxIndex = currentMenu.members.length-1
      let nextIndex = null

      switch( keyCode ) {
        case 'ArrowUp':
          nextIndex = elementIndex === 0 ? maxIndex : elementIndex-1          
          break
        case 'ArrowDown':
          nextIndex = elementIndex < maxIndex ? elementIndex+1 : 0
          break
        default:
      } 

      if( nextIndex !== null ) {
        const nextMenuItem = currentMenu.members[nextIndex]
        const nextEl = this.itemEls[nextMenuItem]
        nextEl.focus()
      }
    }
  }
}

render() {      
    const { offsetX, offsetY, dragging } = this.state
    const { onClose } = this.props
    const { currentMenuID, menuGroups } = this.getCurrentMenu()
    
    if( !menuGroups ) return null

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
        onKeyDown={this.onKeyDown}
      >
        <div className="close-x" onClick={onClose}><i className="fas fa-times fa-sm"></i></div>
        <div className="header" onMouseDown={this.dragMouseDown}>
          <Typography><i className="fas fa-palette fa-sm"></i><span className="title">Elements</span></Typography>
        </div>
        <div className="content">
          { this.renderSelectStructureGroup(menuGroups,currentMenuID) }
          { this.renderStructures(menuGroups[currentMenuID],currentMenuID) }
        </div>
        { this.renderElementInfo() }
      </div>
    )
  }
}