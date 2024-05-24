import React, { Component } from 'react'
import { Button, Typography, Card, CardContent, CardActionArea} from '@material-ui/core'

import NewProjectPanel from './NewProjectPanel'
import NewRemoteProjectPanel from './NewRemoteProjectPanel'

const fairCopy = window.fairCopy

export default class ProjectWindow extends Component {

    constructor() {
        super()
        this.initialState = { 
            mode: 'select', 
            projectName: '',
            description: '',
            errorMessage: null 
        }
        this.state = this.initialState
    }

    renderProjectCard(project) {
        const { projectName, description, projectFilePath } = project

        const onClick = () => {
            fairCopy.services.ipcSend('requestProject', projectFilePath )
        }

        return (
            <Card className='recent-project-card' key={`project-${projectFilePath}`} variant="outlined">
                <CardActionArea onClick={onClick}>
                    <CardContent>
                        <Typography><i className='fas fa-book'></i> {projectName}</Typography>
                        <Typography variant="body2">{description}</Typography>
                    </CardContent>
                </CardActionArea>
            </Card>
        )
    }
  
    renderSelectProject() {
        let projects = localStorage.getItem('recentProjects')
        projects = projects ? JSON.parse(projects) : []

        const onClickOpen = () => {
            fairCopy.services.ipcSend('requestFileOpen')
        }

        const onClickNew = () => {
           this.setState({ ...this.state, mode: 'new' })
        }  

        const onClickNewRemote = () => {
            this.setState({ ...this.state, mode: 'new-remote' })
        }  

        const projectCards = []
        for( const project of projects ) {
            projectCards.push(this.renderProjectCard(project))
        }

        return (
            <div className="content select-project">
                <div className="left-side">
                    <Typography variant="h6" component="h2">Select a Project</Typography>
                    <Button className="left-action" onClick={onClickNew} variant='contained'>New Project...</Button>
                    <Button className="left-action" onClick={onClickNewRemote} variant='contained'>New Remote Project...</Button>
                    <Button className="left-action" onClick={onClickOpen} variant='contained'>Open Project...</Button>
                </div>
                <div className="right-side">
                    <Typography variant="h6" component="h2">Recent Projects</Typography>
                    { projectCards }
                </div>
            </div>
        )
    }

    render() {
        const { appConfig } = this.props
        const { mode } = this.state

        const appVersion = appConfig ? `v${appConfig.version}` : ''
        const devModeTag = appConfig && appConfig.devMode ? 'DEV' : ''

        const onClose = () => {
            this.setState({...this.state, mode: 'select'})
        }

        let content 
        switch(mode) {
            case 'select':
                content = this.renderSelectProject()
                break
            case 'new-remote':
                content = <NewRemoteProjectPanel onClose={onClose}></NewRemoteProjectPanel>
                break
            case 'new':
                content = <NewProjectPanel onClose={onClose}></NewProjectPanel>
                break
            default:
                console.log("Unrecognized view mode.")
                break
        }

        return (
            <main id="ProjectWindow" >
                <header className='header'>
                    <Typography variant="h5" component="h1"><i className='fas fa-feather-alt fa-lg'></i> FairCopy {appVersion} {devModeTag}</Typography>
                    <Typography>A word processor for the humanities scholar.</Typography>
                </header>
                { content }
            </main>
        )
    }

}
