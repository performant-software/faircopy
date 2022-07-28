import React, { Component } from 'react'

import { Typography, TextField, Button } from '@material-ui/core'

import { logout, isLoggedIn } from '../../model/cloud-api/auth'

export default class GeneralSettings extends Component {
    
    constructor(props) {
        super(props)

        this.initialState = {
            validationErrors: {}
        }
        this.state = this.initialState
    }

    renderRemoteSettings() {
        const { projectInfo, onLogin } = this.props
        const { serverURL, email, remote } = projectInfo
        const loggedIn = remote ? isLoggedIn(email, serverURL) : false

        const onLogout = () => {
            logout(email, serverURL)
            this.setState({...this.state})
        }

        const status = loggedIn ? `You are logged into ${serverURL} as ${email}` : `You are not logged in.`
        return (
            <div>
                <p>{ status } </p>
                { loggedIn ? 
                    <Button className="action" variant="contained" onClick={onLogout}>Log Out</Button> :
                    <Button className="action" variant="contained" onClick={onLogin}>Log In</Button>
                }
            </div>
        )
    }

    render() {        
        const onChange = (e) => {
            const { projectInfo, onUpdateProject } = this.props
            let {name, value} = e.target
            const nextErrors = {}
            const nextProjectInfo = { ...projectInfo }

            if( name === 'name' ) {
                value = value.trim()
                if( value.length === 0 ) nextErrors['name'] = "Name cannot be blank."
            }
            nextProjectInfo[name] = value

            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                this.setState(this.initialState)
                onUpdateProject(nextProjectInfo)
            }
        }

        // const onExportConfig = () => {
        //     const { fairCopyConfig } = this.props
        //     const exportPath = 'temp/project-config-export.json'
        //     exportConfig(exportPath,fairCopyConfig)
        // }
        // <Button className="action" variant="contained" onClick={onExportConfig}>Export Project Config</Button>

        const { projectInfo, onReset } = this.props
        const { validationErrors } = this.state
        const { name, description, projectFilePath, remote } = projectInfo
        const disabled = remote

        return (
            <div id="GeneralSettings">
                <Typography variant="h4">Project Settings</Typography>
                <TextField 
                    name="name"
                    className="name-field"
                    value={name}
                    onChange={onChange}
                    error={validationErrors['name'] !== undefined }
                    helperText={validationErrors['name']}
                    aria-label="Project Name"
                    label="Project Name" 
                    disabled={disabled}
                /><br/>
                <TextField 
                    name="description"
                    className="name-field"
                    value={description}
                    onChange={onChange}
                    aria-label="Project Description"
                    label="Project Description" 
                    disabled={disabled}
                /><br/>
                { remote && this.renderRemoteSettings() }
                <div className="actions">
                    <Button className="action" variant="contained" disabled={disabled} onClick={onReset}>Reset Config</Button>
                </div>
                <div className="info">
                    <Typography variant="subtitle2">File Location: {projectFilePath}</Typography>
                </div>
            </div>
        )
    }
}