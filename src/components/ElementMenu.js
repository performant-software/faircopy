import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Paper, ClickAwayListener } from '@material-ui/core'

import ElementInfoPopup from './ElementInfoPopup'

import { validAction, createElement, addInside, addBelow, addAbove, addOutside, replaceElement } from "../tei-document/editor-actions"

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            openSubMenu: null,
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

    renderMenu( menuID, menuItems, subMenu, anchorEl, onClose ) {

        if( !anchorEl ) return null

        let placement, elevation
        if( subMenu ) {
            placement = 'right-start'
            elevation = 12
        } else {
            placement = 'bottom-start'
            elevation = 6
        }

        // TODO use this to navigate submenus
        const onKeyDown = (event) => {
            if( event.key === 'ArrowRight' ) {
                console.log('arrow right')
            }
            if( event.key === 'ArrowLeft' ) {
                console.log('Arrow left')
            }
        }

        const onClickAway = () => {
            // onClose()
        }

        return (
            <Popper className="element-menu-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Paper elevation={elevation}>
                    <ClickAwayListener onClickAway={onClickAway}>
                        <MenuList autoFocusItem={true} id={menuID} onKeyDown={onKeyDown}>
                            { menuItems }
                        </MenuList>
                    </ClickAwayListener>
                </Paper>
            </Popper>
        )
    }

    renderElementInfo() {
        const { elementInfoID } = this.state
        
        if( !elementInfoID ) return null

        const anchorEl = this.itemEls[elementInfoID]
        if( !anchorEl ) return null
        
        return (
            <ElementInfoPopup
                elementID={elementInfoID}
                anchorEl={anchorEl}            
            ></ElementInfoPopup>
        )
    }

    createMenuAction(selection,member,closeSubMenu) {
        const { action, teiDocument, onAlertMessage } = this.props

        return () => {
            if( action === 'create' ) {
                createElement(member.id, teiDocument) 
                closeSubMenu()    
            } else if( action === 'info' ) {
                this.setState({...this.state, elementInfoID: member.id })
            } else {
                if( selection && selection.node ) {
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
                }
                closeSubMenu()    
            }
        }
    }

    renderSubMenu() {
        const { teiDocument, action } = this.props
        const { openSubMenu } = this.state
        const menuGroups = this.getMenuGroups()
        
        if( !openSubMenu || !menuGroups[openSubMenu] ) return

        const members = menuGroups[openSubMenu].members

        const closeSubMenu = () => {
            this.subMenuEls[openSubMenu] = null
            this.setState({...this.state, openSubMenu: null, elementInfoID: null })
        }

        const menuItems = []
        for( const member of members ) {
            const editorView = teiDocument.getActiveView()
            const selection = (editorView) ? editorView.state.selection : null 

            const onClick = this.createMenuAction(selection, member, closeSubMenu)
            const valid = member.enabled ? validAction(action, member.id, teiDocument, selection.anchor ) : false

            menuItems.push(
                <MenuItem 
                    disabled={!valid} 
                    onClick={onClick} 
                    ref={(el)=> { this.itemEls[member.id] = el }}
                    key={`submenu-${member.id}`}
                    disableRipple={true}
                >
                        {member.id}</MenuItem>
            )
        }

        return this.renderMenu( 'submenu', menuItems, true, this.subMenuEls[openSubMenu], closeSubMenu)
    }

    render() {
        const { onClose, menuGroup, elementMenuAnchors } = this.props

        const menuGroups = this.getMenuGroups()
        if( !menuGroups ) return null
        const anchorEl = elementMenuAnchors[menuGroup]
        if( !anchorEl ) return null

        const onClick = (menuGroupID) => { this.setState({...this.state, openSubMenu: menuGroupID })}

        const menuItems = []
        for( const menuGroup of Object.values(menuGroups) ) {
            const menuGroupID = menuGroup.id
            const key = `menugroup-${menuGroupID}`
            menuItems.push(
                <MenuItem 
                    onClick={()=>onClick(menuGroupID)}
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

        return (
            <div id="ElementMenu">
                { this.renderMenu( 'menu', menuItems, false, anchorEl, onClose) }
                { this.renderSubMenu() }
                { this.renderElementInfo() }
            </div>
        )
    }

}
