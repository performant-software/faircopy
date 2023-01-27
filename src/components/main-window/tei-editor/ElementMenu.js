import React, { Component } from 'react'
import { Menu, MenuItem, Typography } from '@material-ui/core'

import ElementInfoPopup from './ElementInfoPopup'
import EmptyGroup from './EmptyGroup';
import { getElementIcon } from '../../../model/TEISchema';

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            subMenuID: null,
            elementInfoID: null
        }
        this.itemEls = {}
        this.groupEls = {}    
    }

    getMenuGroups() {
        const { menus, menuGroup } = this.props
        if( !menuGroup ) return []
        return menus[menuGroup]
    }

    renderElementInfo() {
        const { elements } = this.props
        const { elementInfoID } = this.state
        const anchorEl = this.itemEls[elementInfoID]

        if( elementInfoID === null || !anchorEl ) return null

        const elementSpec = elements[elementInfoID]

        const onAnchorEl = () => {
            const { elementInfoID } = this.state
            return this.itemEls[elementInfoID]
        }

        if(!elementSpec) return null
        
        return (
            <ElementInfoPopup
                elementSpec={elementSpec}
                anchorEl={onAnchorEl}        
            ></ElementInfoPopup>
        )
    }

    renderSubMenu() {
        const { subMenuID } = this.state
        const { onAction, onClose: onCloseMenu, elements, validAction } = this.props
        const menuGroups = this.getMenuGroups()
        const anchorOrigin = { vertical: 'top', horizontal: 'right' }

        if( subMenuID === null || !menuGroups[subMenuID] ) return null

        const { members } = menuGroups[subMenuID]
        const groupEl = this.groupEls[subMenuID]

        if( !groupEl ) return null

        // generate the sub menu items
        const menuItems = []

        const onClose = () => { 
            this.itemEls = {}
            this.setState({...this.state, subMenuID: null })
        }

        if( members.length === 0 ) {
            const {onProjectSettings} = this.props
            menuItems.push(
                <EmptyGroup 
                    key="empty-group" 
                    anchorEl={groupEl}
                    onProjectSettings={onProjectSettings}
                ></EmptyGroup>
            )
            return menuItems
        }

        for( const member of members ) {

            const setItemElRef = (el) => {
                this.itemEls[member] = el
            }

            const valid = validAction( member )
            const onShowInfo = () => { this.setState({ ...this.state, elementInfoID: member })}
            const onHideInfo = () => { this.setState({ ...this.state, elementInfoID: null })}
            const onKeyUp = (e) => { 
                // left arrow
                if( e.keyCode === 37 ) onClose()
            }
            const icon = getElementIcon(member, elements)
            const nameEl = icon ? <span><i className={`${icon} fa-sm`}></i><span className="element-menu-name">{member}</span></span> : <span>{member}</span>

            menuItems.push(
                <MenuItem 
                    ref={setItemElRef}
                    key={`submenu-${member}`}
                    disabled={!valid}
                    disableRipple={true}
                    onFocus={onShowInfo}
                    onBlur={onHideInfo}
                    onMouseOver={onShowInfo}
                    onMouseLeave={onHideInfo}
                    onClick={() => { onAction(member) }}
                    onKeyUp={onKeyUp}
                >
                    {nameEl}
                </MenuItem>
            )
        }

        return (
            <Menu
                open={true}
                onClose={onClose}
                anchorEl={groupEl}
                anchorOrigin={anchorOrigin}
                transitionDuration={0}
                getContentAnchorEl={null}
            >
                { menuItems }
            </Menu>
        )
    }

    renderMenuItems() {
        const menuGroups = this.getMenuGroups()

        // generate the menu items
        const menuItems = []
        let i=0
        for( const menuGroup of menuGroups ) {
            const menuID = i
            const key = `menugroup-${menuID}`
            const showMenu = () => { this.setState({ subMenuID: menuID }) }
            const onKeyUp = (e) => { 
                // right arrow
                if( e.keyCode === 39 ) showMenu()
            }
            const setGroupElRef = (el) => {
                this.groupEls[menuID] = el
            }
            menuItems.push(
                <MenuItem 
                    key={key} 
                    ref={(el)=> { setGroupElRef(el) }}
                    disableRipple={true}
                    className="menu-item"
                    onKeyUp={onKeyUp}
                    onClick={showMenu}
                    value={i++}
                >                   
                    <Typography>{menuGroup.label} </Typography><div className="menu-chevron" ><i className="fas fa-chevron-right"></i></div>
                </MenuItem>
            )
        }

        return menuItems
    }

    render() {  
        const { elementMenuAnchors, menuGroup, onExited, onClose } = this.props
        const anchorEl = elementMenuAnchors[menuGroup]
        const anchorOrigin = { vertical: 'bottom', horizontal: 'left' }

        return (
            <div id="ElementMenu">
                <Menu
                    open={true}
                    onClose={onClose}
                    anchorEl={anchorEl}
                    anchorOrigin={anchorOrigin}
                    getContentAnchorEl={null}
                    TransitionProps={ {onExited} }
                >
                    { this.renderMenuItems() }
                </Menu>
                { this.renderSubMenu() }
                { this.renderElementInfo() }
            </div>
        )
    }

}