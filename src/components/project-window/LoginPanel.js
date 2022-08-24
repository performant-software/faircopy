import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'
import { login } from '../../model/cloud-api/auth'

// used for testing on local server
// const localHostDefaults = {
//     serverURL: 'http://localhost:3789',
//     email: 'admin@performantsoftware.com',
//     password: 'password',
// }

export default class LoginPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            // ...localHostDefaults,
            serverURL: 'https://demo.archivengine.com',
            email: '',
            password: '',
            errorMessage: null 
        }
        this.state = this.initialState
    }

    render() {
        const { onClose, onLoggedIn } = this.props
        
        const onLogin = () => {
            const { serverURL, email, password } = this.state
            const onSuccess = (authToken) => {
                onLoggedIn( serverURL, email, authToken )
            }
            const onFail = (error) => {
                this.setState({...this.state, errorMessage: error, password: ''})
            }
            login(serverURL, email, password, onSuccess, onFail )
        }

        const onChangeServerURL = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, serverURL: value })
        }
        const onChangeEmail = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, email: value })
        }
        const onChangePassword = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, password: value })
        }

        const { serverURL, email, password } = this.state
        const saveAllowed = ( serverURL.length > 0 && email.length > 0 && password.length > 0 )
        const saveButtonClass = saveAllowed ? "login-button-active" : "action-button"

        return (
            <div id="LoginPanel">
                <Typography variant="h6" component="h2">Login to a FairCopy Cloud Server</Typography>
                <ul>
                    <li>
                        <TextField 
                            className="login-field"
                            label="FairCopy Server" 
                            onChange={onChangeServerURL}
                            value={serverURL}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="login-field"
                            label="Email" 
                            onChange={onChangeEmail}
                            value={email}
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
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onLogin} color='primary' variant='contained'>Login</Button>
                    <Button className='action-button' onClick={onClose} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
