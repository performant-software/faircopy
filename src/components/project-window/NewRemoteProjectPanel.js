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
            userID: null,
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
        const { project, userID, serverURL } = this.state
        const { projectID, name, description, permissions } = project
        const projectInfo = { 
            projectID,
            name,
            description,
            userID,
            serverURL,
            filePath,
            permissions,
            remote: true
        }
        fairCopy.services.ipcSend('requestNewProject', projectInfo )
    }

    render() {
        const { onClose } = this.props
        const { step, projects, project } = this.state

        const onLoggedIn = (userID, serverURL, authToken) => {
            this.setState({...this.state, serverURL, userID, step: 1})
            getProjects( userID, serverURL, authToken, (projects)=> {
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
