import React, { Component } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@material-ui/core'

import LoginPanel from '../project-window/LoginPanel'

export default class LoginDialog extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            message: "",
            error: null
        }
        this.state = this.initialState
    }

    render() {      
        const { onClose, onLoggedIn } = this.props

        return (
            <Dialog
                id="LoginDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="login-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="login-title">Login</DialogTitle>
                <DialogContent>
                    <LoginPanel
                        onClose={onClose}
                        onLoggedIn={onLoggedIn}
                    ></LoginPanel>
                </DialogContent>
            </Dialog>
        )
    }
}
