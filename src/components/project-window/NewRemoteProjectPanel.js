import React, { Component } from 'react'

import LoginPanel from './LoginPanel'
import SelectRemoteProjectPanel from './SelectRemoteProjectPanel'
import ChooseLocalFilePanel from './ChooseLocalFilePanel'

import { getProjects } from '../../model/cloud-api/projects'

const fairCopy = window.fairCopy

export default class NewRemoteProjectPanel extends Component {

    constructor() {
        super()
        this.initialState = { 
            step: 0,
            email: null,
            serverURL: null,
            projects: null,
            project: null
        }
        this.state = this.initialState
    }

    onOpenProject = (project) => {
        this.setState({...this.state, project, step: 2})
    }

    onSave = (filePath) => {
        const { project, email, serverURL } = this.state
        const { id, name, description } = project
        const projectInfo = { 
            projectID: id,
            name: name["en"].translation,
            description: description["en"].translation,
            email,
            serverURL,
            filePath,
            remote: true
        }
        fairCopy.services.ipcSend('requestNewProject', projectInfo )
    }

    render() {
        const { onClose } = this.props
        const { step, projects, project } = this.state

        const onLoggedIn = (serverURL, email, authToken) => {
            this.setState({...this.state, serverURL, email, step: 1})
            getProjects( serverURL, authToken, (projects)=> {
                this.setState({...this.state, projects})
            }, (errorMessage) => {
                // TODO
            })
        }

        if( step === 0 ) {
            return <LoginPanel onClose={onClose} onLoggedIn={onLoggedIn}></LoginPanel>
        } else if( step === 1 ) {
            return <SelectRemoteProjectPanel projects={projects} onClose={onClose} onOpenProject={this.onOpenProject}></SelectRemoteProjectPanel>
        } else if( step === 2 ) {
            return <ChooseLocalFilePanel project={project} onClose={onClose} onSave={this.onSave}></ChooseLocalFilePanel>
        }
    }
}