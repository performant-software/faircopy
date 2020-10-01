import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Paper, ClickAwayListener } from '@material-ui/core'

import { createElement, addInside, replaceElement } from "../tei-document/editor-actions"

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            openSubMenu: null
        }
        this.subMenuEls = {}
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

        return (
            <Popper className="element-menu-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Paper elevation={elevation}>
                    <ClickAwayListener onClickAway={onClose}>
                        <MenuList id={menuID}>
                            { menuItems }
                        </MenuList>
                    </ClickAwayListener>
                </Paper>
            </Popper>
        )
    }

    renderSubMenu() {
        const { menuGroups, teiDocument, action, actionData, onAlertMessage } = this.props
        const { openSubMenu } = this.state

        if( !openSubMenu || !menuGroups[openSubMenu] ) return

        const members = menuGroups[openSubMenu].members
       
        const closeSubMenu = () => {
            this.subMenuEls[openSubMenu] = null
            this.setState({...this.state, openSubMenu: null })
        }

        const menuItems = []
        for( const member of members ) {
            const onClick = () => { 
                if( action === 'create' ) {
                    createElement(member.id, teiDocument) 
                } else {
                    const editorView = teiDocument.getActiveView()
                    const selection = (editorView) ? editorView.state.selection : null 
                    if( selection && selection.node ) {
                        let error
                        switch(action) {
                            case 'replace':
                                error = replaceElement(member.id, teiDocument, selection.anchor) 
                                break
                            case 'addAbove':
                                // TODO
                                break
                            case 'addBelow':
                                // TODO
                                break
                            case 'addInside':
                                error = addInside(member.id, teiDocument, selection.anchor) 
                                break
                            case 'addOutside':
                                // TODO
                                break
                            default:
                                error = 'Unknown action type selected in ElementMenu'
                        }
                        if( error ) {
                            onAlertMessage(error)
                        }    
                    }
                }
                closeSubMenu()    
            }
            menuItems.push(
                <MenuItem 
                    disabled={!member.enabled} 
                    onClick={onClick} 
                    key={`submenu-${member.id}`}
                    disableRipple={true}
                >
                        {member.id}</MenuItem>
            )
        }

        return this.renderMenu( 'submenu', menuItems, true, this.subMenuEls[openSubMenu], closeSubMenu)
    }

    render() {
        const { anchorEl, onClose, menuGroups } = this.props

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
            </div>
        )
    }

}
