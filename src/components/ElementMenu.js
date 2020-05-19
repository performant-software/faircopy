import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Grow, Paper, ClickAwayListener } from '@material-ui/core'

export default class ElementMenu extends Component {

    constructor() {
        super()
        this.state = {
            subMenu: false
        }
    }

    renderSubMenu() {
        const { subMenu } = this.state

        if( !subMenu || !this.subMenuEl ) return null

        const onClose = () => { 
            this.subMenuEl = null
            this.setState({...this.state, subMenu: false })
        }

        return (
            <Popper  className="element-menu-popup" open={true} anchorEl={this.subMenuEl} role={undefined} transition disablePortal>
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                    >
                    <Paper>
                        <ClickAwayListener onClickAway={onClose}>
                            <MenuList id="submenu-list-grow">
                                <MenuItem onClick={onClose}>Sub 1</MenuItem>
                                <MenuItem onClick={onClose}>Sub 2</MenuItem>
                                <MenuItem onClick={onClose}>Sub 3</MenuItem>
                            </MenuList>
                        </ClickAwayListener>
                    </Paper>
                    </Grow>
                )}
            </Popper>
        )
    }

    render() {
        const { anchorEl, onClose } = this.props

        if( !anchorEl ) return null

        const openSubMenu = () => { this.setState({...this.state, subMenu: true })}

        return (
            <div id="ElementMenu">
                <Popper  className="element-menu-popup" open={true} anchorEl={anchorEl} role={undefined} transition disablePortal>
                    {({ TransitionProps, placement }) => (
                        <Grow
                            {...TransitionProps}
                            style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                        >
                        <Paper>
                            <ClickAwayListener onClickAway={onClose}>
                                <MenuList id="menu-list-grow">
                                    <MenuItem ref={(el)=> { this.subMenuEl = el }} onClick={openSubMenu}>Profile <i className="fas fa-chevron-right"></i></MenuItem>
                                    <MenuItem onClick={onClose}>My account</MenuItem>
                                    <MenuItem onClick={onClose}>Logout</MenuItem>
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                        </Grow>
                    )}
                </Popper>
                { this.renderSubMenu() }
            </div>
        )
    }

}
