import React, { Component } from 'react'
import { MenuItem, Menu } from '@material-ui/core'

export default class PopupMenu extends Component {
    render() {
        const { menuOptions, anchorEl, onClose, placement } = this.props

        if( !anchorEl ) return null

        const menuItems = []
        for( const menuOption of menuOptions ) {
            const key = `menugroup-${menuOption.id}`
            const onClick = () => {
                menuOption.action()
            }    
            menuItems.push(
                <MenuItem 
                    onClick={onClick}
                    key={key} 
                    className="menu-item"
                    disabled={menuOption.disabled}
                    value={menuOption.id}
                >
                    {menuOption.label}
                </MenuItem>
            )
        }
        
        const anchorOrigin = placement ? placement : { vertical: 'bottom', horizontal: 'center' }

        return (
            <div id="PopupMenu">
                <Menu                            
                    open={true}
                    onClose={onClose}
                    anchorEl={anchorEl}
                    anchorOrigin={anchorOrigin}
                    getContentAnchorEl={null}
                >
                    { menuItems }
                </Menu>
            </div>
        )
    }
}
