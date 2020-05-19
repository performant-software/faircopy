import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Grow, Paper, ClickAwayListener } from '@material-ui/core'

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
            placement = 'bottom'
            elevation = 6
        }

        return (
            <Popper className="element-menu-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} transition disablePortal>
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                    >
                    <Paper elevation={elevation}>
                        <ClickAwayListener onClickAway={onClose}>
                            <MenuList id={menuID}>
                                { menuItems }
                            </MenuList>
                        </ClickAwayListener>
                    </Paper>
                    </Grow>
                )}
            </Popper>
        )
    }

    renderSubMenu() {
        const { menuGroups } = this.props
        const { openSubMenu } = this.state

        if( !openSubMenu ) return

        const members = menuGroups[openSubMenu].members

        const closeSubMenu = () => { 
            this.subMenuEls[openSubMenu] = null
            this.setState({...this.state, openSubMenu: null })
        }

        const menuItems = []
        for( const member of members ) {
            menuItems.push(
                <MenuItem disabled={!member.enabled} key={`submenu-${member.id}`} onClick={closeSubMenu}>{member.id}</MenuItem>
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
                    value={menuGroupID}
                >
                    {menuGroup.label} <i className="fas fa-chevron-right"></i>
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
