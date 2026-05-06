import React, { Component } from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@material-ui/core'

import { login } from '../../../model/cloud-api/auth'

export default class LoginDialog extends Component {

    constructor(props) {
        super(props)
        this.initialState = {
            waiting: false,
            errorMessage: null
        }
        this.state = this.initialState
    }

    render() {      
        const { onClose, onLoggedIn, ssoUrl } = this.props
        
        const onLogin = () => {
            const onSuccess = (id, backendUrl, authToken) => {
                onLoggedIn()
            }
            const onFail = (error) => {
                this.setState({...this.state, errorMessage: error, waiting: false})
            }
            login(ssoUrl, onSuccess, onFail)
            window.fairCopy.getSsoUrl().then((result) => {
                this.setState({ ...this.state, waiting: true, ssoUrl: result })
            })
        }
        const onKeyPress = (e) => {
            if( e.key === 'Enter' ) {
                onLogin()
            }
        }

        return (
            <Dialog
                id="LoginDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="login-title"
            >
                <DialogTitle id="login-title">Log in with FairCopy Server</DialogTitle>
                <DialogContent onKeyPress={onKeyPress}>
                    <ul>
                        <li>
                            <TextField 
                                className="login-field"
                                label="FairCopy Server" 
                                value={ssoUrl}
                                disabled
                            />
                        </li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onLogin} color='primary' variant='contained'>Log in</Button>
                    <Button className='action-button' onClick={onClose} variant='contained'>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}
