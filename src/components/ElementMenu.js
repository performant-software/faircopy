import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Grow, Paper, ClickAwayListener } from '@material-ui/core'

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            subMenu: false
        }
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
            <Popper  className="element-menu-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} transition disablePortal>
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
        const { subMenu } = this.state

        if( !subMenu || !this.subMenuEl ) return null

        const onClose = () => { 
            this.subMenuEl = null
            this.setState({...this.state, subMenu: false })
        }

        const menuItems = [ <MenuItem key="sub-menu-1" onClick={onClose}>Sub 1</MenuItem> ]

        return this.renderMenu( 'submenu', menuItems, true, this.subMenuEl, onClose)
    }

    render() {
        const { anchorEl, onClose } = this.props

        if( !anchorEl ) return null

        const openSubMenu = () => { this.setState({...this.state, subMenu: true })}

        const menuItems = [
            <MenuItem key="menu-1" ref={(el)=> { this.subMenuEl = el }} onClick={openSubMenu}>Profile <i className="fas fa-chevron-right"></i></MenuItem>,
            <MenuItem key="menu-2" onClick={onClose}>My account</MenuItem>,
            <MenuItem key="menu-3" onClick={onClose}>Logout</MenuItem>    
        ]

        return (
            <div id="ElementMenu">
                { this.renderMenu( 'menu', menuItems, false, anchorEl, onClose) }
                { this.renderSubMenu() }
            </div>
        )
    }

}
