import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Paper } from '@material-ui/core'

import ElementInfoPopup from './ElementInfoPopup'

import { validAction, createElement, addInside, addBelow, addAbove, addOutside, replaceElement, determineRules } from "../tei-document/editor-actions"

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            openSubMenu: null,
            activeMenu: 'menu',
            elementInfoID: null
        }
        this.subMenuEls = {}
        this.itemEls = {}
    }

    getMenuGroups() {
        const { teiDocument, menuGroup } = this.props
        if(!teiDocument) return null
        const { menus } = teiDocument.fairCopyProject
        return menus[menuGroup]
    }

    checkActiveMenu() {
        setTimeout(()=>{
            const { onClose } = this.props 
            const { activeMenu } = this.state
            if( !activeMenu ) onClose()    
        }, 250)
    }

    renderMenu() {
        const { elementMenuAnchors, menuGroup } = this.props
        const menuGroups = this.getMenuGroups()
        const anchorEl = elementMenuAnchors[menuGroup]

        if( !anchorEl || !menuGroups ) return null

        // main menu mouse events
        const onMouseOver = (menuGroupID) => { 
            this.itemEls = {}
            this.setState({...this.state, activeMenu: 'menu', openSubMenu: menuGroupID })
        }
        const onMouseLeave = () => { 
            this.setState({...this.state, activeMenu: null })
            this.checkActiveMenu()
        }

        // generate the menu items
        const menuItems = []
        for( const menuGroup of Object.values(menuGroups) ) {
            const menuGroupID = menuGroup.id
            const key = `menugroup-${menuGroupID}`
            menuItems.push(
                <MenuItem 
                    onMouseOver={()=>{onMouseOver(menuGroupID)}}
                    ref={(el)=> { this.subMenuEls[menuGroupID] = el }}
                    key={key} 
                    disableRipple={true}
                    className="menu-item"
                    value={menuGroupID}
                >
                    {menuGroup.label} <i className="menu-chevron fas fa-chevron-right"></i>
                </MenuItem>
            )
        }

        const placement = 'bottom-start'
        const elevation = 6
        
        // main menu keyboard events
        const onKeyDown = (event) => {
            if( event.key === 'ArrowRight' ) {
                console.log('arrow right')
            }
        }

        return (
            <Popper className="element-menu-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Paper elevation={elevation}>
                    <MenuList autoFocusItem={true} id='menu' onMouseLeave={onMouseLeave} onKeyDown={onKeyDown}>
                        { menuItems }
                    </MenuList>
                </Paper>
            </Popper>
        )
    }

    renderElementInfo() {
        const { teiDocument, menuGroup } = this.props
        const { elementInfoID } = this.state
        const anchorEl = this.itemEls[elementInfoID]

        if( !elementInfoID || !anchorEl ) return null

        const { elements } = teiDocument.fairCopyProject.teiSchema
        const elementSpec = elements[elementInfoID]

        if(!elementSpec) return null

        // element info mouse events
        const onMouseOver = () => {
            this.setState({...this.state, activeMenu: 'info' })
        }
        const onMouseLeave = () => {
            this.setState({...this.state, activeMenu: null })
            this.checkActiveMenu()
        }
        
        // get the text for the structure rules
        const rules = menuGroup === 'structure' ? determineRules(elementInfoID,teiDocument) : {}

        return (
            <ElementInfoPopup
                onMouseOver={onMouseOver}
                onMouseLeave={onMouseLeave}
                elementSpec={elementSpec}
                anchorEl={anchorEl}        
                { ...rules }    
            ></ElementInfoPopup>
        )
    }

    createMenuAction(selection,member) {
        const { action, teiDocument, onAlertMessage, onClose } = this.props

        return () => {
            if( action === 'info' ) return

            if( selection ) {
                if( selection.node ) {
                    try {
                        switch(action) {
                            case 'replace':
                                replaceElement(member.id, teiDocument, selection.anchor) 
                                break
                            case 'addAbove':
                                addAbove(member.id, teiDocument, selection.anchor) 
                                break
                            case 'addBelow':
                                addBelow(member.id, teiDocument, selection.anchor) 
                                break
                            case 'addInside':
                                addInside(member.id, teiDocument, selection.anchor) 
                                break
                            case 'addOutside':
                                addOutside(member.id, teiDocument, selection.anchor) 
                                break
                            default:
                                throw new Error('Unknown action type selected in ElementMenu')
                        }    
                    } catch(err) {
                        onAlertMessage(err.message)
                    }
                } else {
                    createElement(member.id, teiDocument) 
                }
            }

            onClose()
        }
    }

    renderSubMenu() {
        const { teiDocument, action } = this.props
        const { openSubMenu } = this.state
        const menuGroups = this.getMenuGroups()
        
        if( !openSubMenu || !menuGroups[openSubMenu] ) return

        const anchorEl = this.subMenuEls[openSubMenu]
        if( !anchorEl ) return null

        const placement = 'right-start'
        const elevation = 12

        const members = menuGroups[openSubMenu].members

        // generate the sub menu items
        const menuItems = []
        for( const member of members ) {
            const editorView = teiDocument.getActiveView()
            const selection = (editorView) ? editorView.state.selection : null 

            const valid = !member.enabled ? false : validAction(action, member.id, teiDocument, selection )
            const onClick = (valid && action !== 'info') ? this.createMenuAction(selection, member) : () => {}

            const onMenuItemMouseOver = () => {
                if( action === 'info' ) {
                    setTimeout( () => {
                        this.setState({...this.state, elementInfoID: member.id })
                    }, 250 )
                }
            }

            const onMenuItemMouseLeave = () => {
                this.itemEls[member.id] = null
                this.setState({...this.state, elementInfoID: null })
            }

            const setItemElRef = (el) => {
               this.itemEls[member.id] = el
            }

            menuItems.push(
                <MenuItem 
                    disabled={!valid} 
                    onClick={onClick} 
                    onMouseOver={onMenuItemMouseOver}
                    onMouseLeave={onMenuItemMouseLeave}
                    ref={setItemElRef}
                    key={`submenu-${member.id}`}
                    disableRipple={true}
                >
                        {member.id}</MenuItem>
            )
        }

        // sub menu keyboard events
        const onKeyDown = (event) => {
            if( event.key === 'ArrowLeft' ) {
                console.log('Arrow left')
            }
        }

        // sub menu mouse events
        const onMouseOver = () => {
            this.setState({...this.state, activeMenu: 'submenu' })
        }
        const onMouseLeave = () => {
            this.subMenuEls[openSubMenu] = null
            this.itemEls = {}
            this.setState({...this.state, activeMenu: null })
            this.checkActiveMenu()
        }

        return (
            <Popper className="element-menu-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Paper elevation={elevation}>
                    <MenuList autoFocusItem={true} id='submenu' onMouseOver={onMouseOver} onMouseLeave={onMouseLeave} onKeyDown={onKeyDown}>
                        { menuItems }
                    </MenuList>
                </Paper>
            </Popper>
        )
    }

    render() {        
        const menu = this.renderMenu()
        if( !menu ) return null

        return (
            <div id="ElementMenu">
                { menu }
                { this.renderSubMenu() }
                { this.renderElementInfo() }
            </div>
        )
    }

}
