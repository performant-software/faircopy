import React, { Component } from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@material-ui/core'

import { login } from '../../../model/cloud-api/auth'

export default class LoginDialog extends Component {

    constructor(props) {
        super(props)

        this.initialState = {
            email: '',
            password: '',
            errorMessage: null
        }
        this.state = this.initialState
    }

    render() {      
        const { onClose, onLoggedIn, serverURL } = this.props
        
        const onLogin = () => {
            const { email, password } = this.state
            const onSuccess = (id, authToken) => {
                onLoggedIn( id, serverURL, authToken )
            }
            const onFail = (error) => {
                this.setState({...this.state, errorMessage: error, password: ''})
            }
            login(serverURL, email, password, onSuccess, onFail )
        }
        const onChangePassword = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, password: value })
        }
        const onChangeEmail = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, email: value })
        }

        const { email, password } = this.state
        const saveAllowed = ( password.length > 0 && email.length > 0 )

        return (
            <Dialog
                id="LoginDialog"
                open={true}
                onClose={onClose}
                aria-labelledby="login-title"
            >
                <DialogTitle id="login-title">Login to Remote Server</DialogTitle>
                <DialogContent>
                    <ul>
                        <li>
                            <TextField 
                                className="login-field"
                                label="FairCopy Server" 
                                value={serverURL}
                                disabled
                            />
                        </li>
                        <li>
                            <TextField 
                                className="login-field"
                                label="Email" 
                                value={email}
                                onChange={onChangeEmail}
                            />
                        </li>
                        <li>
                        <TextField 
                                className="login-field"
                                label="Password" 
                                type="password"
                                onChange={onChangePassword}
                                value={password}
                            />
                        </li>
                    </ul>
                </DialogContent>
                <DialogActions>
                    <Button disabled={!saveAllowed} onClick={onLogin} color='primary' variant='contained'>Login</Button>
                    <Button className='action-button' onClick={onClose} variant='contained'>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }
}
