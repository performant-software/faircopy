import React, { Component } from 'react'
import { Popper, MenuItem, MenuList, Paper, ClickAwayListener } from '@material-ui/core'

export default class PopupMenu extends Component {
    render() {
        const { menuOptions, anchorEl, onClose } = this.props

        if( !anchorEl ) return null

        const menuItems = []
        for( const menuOption of menuOptions ) {
            const key = `menugroup-${menuOption.id}`
            const onClick = () => {
                menuOption.action()
                onClose()
            }    
            menuItems.push(
                <MenuItem 
                    onClick={onClick}
                    key={key} 
                    disableRipple={true}
                    className="menu-item"
                    value={menuOption.id}
                >
                    {menuOption.label}
                </MenuItem>
            )
        }
        
        const placement = 'bottom-start'
        const elevation = 6

        return (
            <div id="PopupMenu">
                 <Popper className="popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                    <Paper elevation={elevation}>
                        <ClickAwayListener onClickAway={onClose}>
                            <MenuList>
                                { menuItems }
                            </MenuList>
                        </ClickAwayListener>
                    </Paper>
                </Popper>
            </div>
        )
    }
}
