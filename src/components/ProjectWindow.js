import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, TextField, CardActionArea} from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {

    constructor() {
        super()
        this.initialState = { 
            mode: 'select', 
            projectName: '',
            description: '',
            filePath: ''
        }
        this.state = this.initialState
    }

    componentDidMount() {
        const {services} = fairCopy
        services.ipcRegisterCallback('pathSelected', (event, filePath) => this.onPathUpdated(filePath))
    }

    onPathUpdated(filePath) {
        this.setState({...this.state, filePath })
    }

    renderNewProject() {
        const onClickSave = () => {
            const { projectName, description, filePath } = this.state
            const projectInfo = { 
                name: projectName,
                description,
                filePath
            }
            fairCopy.services.ipcSend('requestNewProject', projectInfo )
        }
        const onClickCancel = () => {
            this.setState({ ...this.initialState })
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
        return (
            <div className="content new-project-form">
                <Typography variant="h6" component="h2">New Project</Typography>
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
                            label="Description" 
                            onChange={onChangeDescription}
                            value={description}
                            multiline
                            rows={3}
                        />
                    </li>
                    <li>
                        <TextField 
                            className="new-project-field"
                            label="Project File" 
                            value={filePath}
                            disabled
                        />
                        <Button className='browse-button'onClick={onClickBrowse} variant='outlined'>Browse...</Button>
                    </li>
                </ul>
                <div className='form-actions'>
                    <Button disabled={!saveAllowed} className='action-button' onClick={onClickSave} variant='outlined'>Save</Button>
                    <Button className='action-button' onClick={onClickCancel} variant='outlined'>Cancel</Button>
                </div>
            </div>
        )
    }
  
    renderSelectProject() {
        const projectPath = 'test-docs/example.faircopy'
        const onClickRecent = () => {
            fairCopy.services.ipcSend('requestProject', projectPath )
        }
        const onClickOpen = () => {
            fairCopy.services.ipcSend('requestFileOpen')
        }
        const onClickNew = () => {
           this.setState({ ...this.state, mode: 'new' })
        }
        return (
            <div className="content select-project">
                <div className="left-side">
                    <ul>
                        <li><Button onClick={onClickNew} variant='outlined'>New Project...</Button></li>
                        <li><Button onClick={onClickOpen} variant='outlined'>Open Project...</Button></li>
                    </ul>
                </div>
                <div className="right-side">
                    <Typography variant="h6" component="h2">Recent Projects</Typography>
                    <Card variant="outlined">
                        <CardActionArea onClick={onClickRecent}>
                            <CardContent>
                                <Typography><i className='fas fa-book'></i> Example Project</Typography>
                                <Typography variant="body2">{projectPath}</Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                </div>
            </div>
        )
    }

    render() {
        const { mode } = this.state
        
        return (
            <div id="ProjectWindow" >
                <div className='header'>
                    <Typography variant="h5" component="h1"><i className='fas fa-feather-alt fa-lg'></i> FairCopy</Typography>
                    <Typography>A word processor for the humanities scholar.</Typography>
                </div>
                { mode === 'select' ? this.renderSelectProject() : this.renderNewProject() }
                <div>
                    <Typography className='version'>Version: v0.6.0</Typography>
                </div>
            </div>
        )
    }

}
