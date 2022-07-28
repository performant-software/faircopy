import React, { Component } from 'react'
import { Button, Typography, TextField } from '@material-ui/core'

const fairCopy = window.fairCopy

export default class NewProjectPanel extends Component {

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
                remote: false
            }
            fairCopy.services.ipcSend('requestNewProject', projectInfo )
        }
        const onClickCancel = () => {
            onClose()
        }
        const onClickBrowse = () => {
            fairCopy.services.ipcSend('requestNewPath' )
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
                <Typography variant="h6" component="h2">Start a New Project</Typography>
                <ul>
                    <li>
                        <TextField 
                            className="new-project-field"
                            value={projectName}
                            onChange={onChangeName}
                            label="Project Name" 
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Short Description" 
                            onChange={onChangeDescription}
                            value={description}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Project File" 
                            value={filePath}
                            disabled
                        />
                        <Button size='small' className='browse-button'onClick={onClickBrowse} variant='contained'>Choose Save File Path</Button>
                    </li>
                    <li><Typography className="instructions"><i className="far fa-lightbulb-on fa-lg"></i> Give your project and name and a short description, then choose where you want the project file to be saved.</Typography></li>
                </ul>
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className={saveButtonClass} onClick={onClickSave} color='primary' variant='contained'>Save</Button>
                    <Button className='action-button' onClick={onClickCancel} variant='contained'>Cancel</Button>
                </div>
            </div>
        )
    }
}
