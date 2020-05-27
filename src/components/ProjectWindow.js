import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, CardActionArea} from '@material-ui/core'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {

    constructor() {
        super()
        this.initialState = { mode: 'select' }
        this.state = this.initialState
    }

    renderNewProject() {
        const onClickSave = () => {
            const projectInfo = { 
                name: "Example 2",
                description: "This is a test project.",
                filePath: "test-docs/example2.faircopy" 
            }
            fairCopy.services.ipcSend('requestNewProject', projectInfo )
        }
        const onClickCancel = () => {
            this.setState({ ...this.initialState })
        }
        return (
            <div className="content">
                <Button onClick={onClickSave} variant='outlined'>Save</Button>
                <Button onClick={onClickCancel} variant='outlined'>Cancel</Button>
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
            <div className="content">
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
