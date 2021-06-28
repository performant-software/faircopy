import React, { Component } from 'react'
import { Snackbar } from '@material-ui/core'
import { Alert } from '@material-ui/lab';

export default class SnackAlert extends Component {
    render() {
        const { open, handleClose, message } = this.props

        return (
            <Snackbar 
                open={open} 
                onClose={handleClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleClose} severity="warning">
                    { message }
                </Alert>
            </Snackbar>
        )
    }
}
