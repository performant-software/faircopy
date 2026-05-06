import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'
import { login } from '../../model/cloud-api/auth'

// used for testing on local server
// const localHostDefaults = {
//     ssoUrl: 'http://localhost:3789',
// }

export default class LoginPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            // ...localHostDefaults,
            ssoUrl: 'http://localhost:5173',
            waiting: false,
            errorMessage: null
        }
        this.state = this.initialState
    }

    render() {
        const { onClose, onLoggedIn } = this.props
        
        const onLogin = () => {
            const onSuccess = (id, backendUrl, authToken) => {
                const baseSsoUrl = new URL(this.state.ssoUrl).origin
                onLoggedIn( id, backendUrl, baseSsoUrl, authToken )
            }

            const onFail = (error) => {
                this.setState({...this.state, errorMessage: error})
            }

            login(this.state.ssoUrl, onSuccess, onFail)

            window.fairCopy.getSsoUrl().then((result) => {
                this.setState({ ...this.state, waiting: true, ssoUrl: result })
            })
        }

        const onChangeSSOUrl = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, ssoUrl: value })
        }
        
        const onKeyPress = (e) => {
            if( e.key === 'Enter' ) {
                onLogin()
            }
        }

        const onCancel = () => {
            window.fairCopy.stopAuthServer()
            this.props.onClose()
        }

        const saveAllowed = ( this.state.ssoUrl.length > 0 )
        const saveButtonClass = saveAllowed ? "login-button-active" : "action-button"

        return (
            <div id="LoginPanel" onKeyPress={onKeyPress} >
                <Typography variant="h6" component="h2">Log in with FairCopy Server</Typography>
                { this.state.waiting && (
                    <Typography variant="body1">Waiting for authentication...</Typography>
                )}
                { !this.state.waiting && (
                    <ul>
                        <li>
                            <TextField
                                className="login-field"
                                label="FairCopy Server" 
                                onChange={onChangeSSOUrl}
                                value={this.state.ssoUrl}
                            />
                        </li>
                    </ul>
                )}
                { this.state.ssoUrl && this.state.waiting && (
                    <Typography variant="body2">If your browser did not open automatically, please click the link below to open the login page:
                        <Button onClick={() => fairCopy.ipcSend('openWebpage', this.state.ssoUrl)} variant='contained'>Open Link</Button>
                    </Typography>
                )}
                { this.state.errorMessage && (
                    <Typography variant="body2" color="error">{this.state.errorMessage}</Typography>
                )}
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onLogin} color='primary' variant='contained'>Log in</Button>
                    <Button onClick={onCancel} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
