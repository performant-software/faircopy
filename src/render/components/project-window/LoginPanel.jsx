import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'
import { login } from '../../model/cloud-api/auth'

// used for testing on local server
// const localHostDefaults = {
//     serverURL: 'http://localhost:3789',
// }

export default class LoginPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            // ...localHostDefaults,
            serverURL: 'https://beta-app.faircopy.cloud',
            waiting: false,
        }
        this.state = this.initialState
    }

    render() {
        const { onClose, onLoggedIn } = this.props
        
        const onLogin = () => {
            const { serverURL } = this.state

            const onSuccess = (id, authToken) => {
                onLoggedIn( id, serverURL, authToken )
            }

            const onFail = (error) => {
                this.setState({...this.state, errorMessage: error})
            }

            this.setState({...this.state, waiting: true})
            login(serverURL, onSuccess, onFail)
        }

        const onChangeServerURL = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, serverURL: value })
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

        const { serverURL } = this.state
        const saveAllowed = ( serverURL.length > 0 )
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
                                onChange={onChangeServerURL}
                                value={serverURL}
                            />
                        </li>
                    </ul>
                )}
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onLogin} color='primary' variant='contained'>Log in</Button>
                    <Button onClick={onCancel} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
