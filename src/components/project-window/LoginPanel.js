import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'

// const fairCopy = window.fairCopy

export default class LoginPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            serverURL: 'http://localhost:3879',
            email: '',
            password: '',
            errorMessage: null 
        }
        this.state = this.initialState
    }

    render() {
        const { onClose } = this.props
        
        const onLogin = () => {
            // fairCopy.services.ipcSend('requestNewProject', projectInfo )
        }

        const onChangeName = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, projectName: value })
        }
        const { serverURL, email, password } = this.state
        const saveAllowed = ( serverURL.length > 0 && email.length > 0 && password.length > 0 )
        const saveButtonClass = saveAllowed ? "login-button-active" : "action-button"

        return (
            <div id="LoginPanel">
                <Typography variant="h6" component="h2">Login to FairCopy Server</Typography>
                <ul>
                    <li>
                        <TextField 
                            className="login-field"
                            label="FairCopy Server" 
                            onChange={onChangeName}
                            value={serverURL}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="login-field"
                            label="Email" 
                            onChange={onChangeName}
                            value={email}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="login-field"
                            label="Password" 
                            onChange={onChangeName}
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
