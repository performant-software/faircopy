import React, { Component } from 'react'
import { Popper, Paper, ClickAwayListener } from '@material-ui/core'


export default class ElementInfoPopup extends Component {

    render() {
        const { anchorEl } = this.props
    
        const onClose = () => {}

        return (
            <Popper className="element-menu-popup" placement='right' open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                <Paper elevation={12}>
                    <ClickAwayListener onClickAway={onClose}>
                        <h1>This is Sparta!</h1>
                    </ClickAwayListener>
                </Paper>
            </Popper>
        )
    }

}
