import React, { Component } from 'react'
import { MenuItem, Menu, Divider, withStyles, ListItemIcon, ListItemText } from '@material-ui/core'

const StyledMenuItem = withStyles((theme) => ({
    root: {
        '&.danger .MuiListItemIcon-root, &.danger .MuiListItemText-primary': {
            color: theme.palette.error.dark,
        },
        '& .MuiListItemIcon-root': {
            minWidth: '32px'
        }
    },
}))(MenuItem)

const StyledDivider = withStyles((theme) => ({
    root: {
        margin: '4px 0',
    },
}))(Divider)

export default class PopupMenu extends Component {
    MENU_ICONS = {
        'check-in': 'fa-cloud-arrow-up',
        'check-out': 'fa-cloud-arrow-down',
        'delete': 'fa-trash-can',
        'export': 'fa-download',
        'move': 'fa-folder-open',
        'abandon': 'fa-lock-open',
        'recover': 'fa-trash-arrow-up',
        'revert': 'fa-undo'
    }

    render() {
        const { menuOptions, anchorEl, onClose, placement } = this.props

        if( !anchorEl ) return null

        const menuItems = []
        for( const menuOption of menuOptions ) {
            const key = `menugroup-${menuOption.id}`
            const onClick = () => {
                menuOption.action()
            }
            if (menuOption.id === 'delete' || menuOption.id === 'abandon') {
                menuItems.push(<StyledDivider component="li" key="divider" light />)
            }
            const icon = Object.hasOwn(this.MENU_ICONS, menuOption.id) ? this.MENU_ICONS[menuOption.id] : ''
            menuItems.push(
                <StyledMenuItem
                    onClick={onClick}
                    key={key}
                    className={`menu-item ${menuOption.classes || ''}`}
                    disabled={menuOption.disabled}
                    value={menuOption.id}
                >
                    <ListItemIcon>
                        <i className={`fa ${icon}`}></i>
                    </ListItemIcon>
                    <ListItemText primary={menuOption.label} />
                </StyledMenuItem>
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
