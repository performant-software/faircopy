import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core'

export default class AlertDialog extends Component {

    renderActions() {
        const { actions } = this.props

        if( !actions ) return null

        const actionButtons = []
        let i = 0
        for( const action of actions ) {
            const { label, defaultAction, handler } = action
            const buttonKey = `action-button-${i++}`
            const actionOptions = defaultAction ? { autoFocus: true } : {}
            actionButtons.push(
                <Button
                    key={buttonKey}
                    onClick={handler}
                    { ...actionOptions }
                >
                    { label }
                </Button>
            )
        }

        return actionButtons
    }

    render() {      
        const { open, title, message, handleClose } = this.props
        
        // const handleSave = () => {
        //     this.requestSave()
        // }

        // const handleClose = () => {
        //     this.setState({...this.state, exitAnyway: true });
        //     alertDialogMode === 'close' ? window.close() : this.newFile()
        // }
        
        // let message
        // if( alertDialogMode === 'close' ) {
        //     message = "Do you wish to save this file before exiting?"
        // } else if( alertDialogMode === 'new' ) {
        //     message = "Do you wish to save this file before creating a new document?"
        // }

        return (
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        { message }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    { this.renderActions() }
                </DialogActions>
            </Dialog>
        )
    }

}
