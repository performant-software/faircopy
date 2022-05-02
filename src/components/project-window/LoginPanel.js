import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class LoginPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            projectName: '',
            description: '',
            filePath: '',
            errorMessage: null 
        }
        this.state = this.initialState
    }

    onPathSelected = (event, filePath) => this.onPathUpdated(filePath)

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('pathSelected', this.onPathSelected )
    }

    componentWillUnmount() {
        const {services} = fairCopy
        services.ipcRemoveListener('pathSelected', this.onPathSelected )
    }

    onPathUpdated(filePath) {
        if( filePath ) {
            this.setState({...this.state, filePath })
        }
    }

    render() {
        const { onClose } = this.props
        
        const onClickSave = () => {
            const { projectName, description, filePath } = this.state
            const projectInfo = { 
                name: projectName,
                description,
                filePath,
                remote: true
            }
            fairCopy.services.ipcSend('requestNewProject', projectInfo )
        }
        const onClickCancel = () => {
            onClose()
        }
        const onChangeName = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, projectName: value })
        }
        const onChangeDescription = (e) => {
            const value = e.currentTarget.value
            this.setState({...this.state, description: value })
        }
        const { projectName, description, filePath } = this.state
        const saveAllowed = (projectName.length > 0 && filePath.length > 0 )
        const saveButtonClass = saveAllowed ? "save-button-active" : "action-button"

        return (
            <div className="content new-project-form">
                <Typography variant="h6" component="h2">Start a New Remote Project</Typography>
                <ul>
                    <li>
                        <TextField 
                            className="new-project-field"
                            value={projectName}
                            onChange={onChangeName}
                            label="FairCopy Server" 
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Email" 
                            onChange={onChangeDescription}
                            value={description}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Password" 
                            onChange={onChangeDescription}
                            value={description}
                        />
                    </li>
                </ul>
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickSave} color='primary' variant='contained'>Login</Button>
                    <Button className='action-button' onClick={onClickCancel} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
