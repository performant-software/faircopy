import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core'

export default class AlertDialog extends Component {

    render() {      
        const {alertDialogMode} = this.props
        
        const handleSave = () => {
            this.requestSave()
        }

        const handleClose = () => {
            this.setState({...this.state, exitAnyway: true });
            alertDialogMode === 'close' ? window.close() : this.newFile()
        }
        
        let message
        if( alertDialogMode === 'close' ) {
            message = "Do you wish to save this file before exiting?"
        } else if( alertDialogMode === 'new' ) {
            message = "Do you wish to save this file before creating a new document?"
        }

        return (
            <Dialog
                open={alertDialogMode !== false}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Unsaved changes"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        { message }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSave} color="primary" autoFocus>
                    Save
                    </Button>
                    <Button onClick={handleClose} color="primary">
                    Don't Save
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

}
