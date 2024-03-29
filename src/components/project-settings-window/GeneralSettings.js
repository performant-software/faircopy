import React, { Component } from 'react'

import { Paper, Typography, TextField, Button } from '@material-ui/core'
import { canCheckOut, canCreate, canDelete, canConfigAdmin } from '../../model/permissions'

export default class GeneralSettings extends Component {
    
    constructor(props) {
        super(props)

        this.initialState = {
            validationErrors: {}
        }
        this.state = this.initialState
    }

    renderPermissions( permissions ) {
        const checkout = yesOrNo(canCheckOut(permissions))
        const create = yesOrNo(canCreate(permissions))
        const del = yesOrNo(canDelete(permissions))
        const config = yesOrNo(canConfigAdmin(permissions))

        return (
            <Paper className="permissions-section" elevation={1}>
                <Typography variant="h5">User Permissions</Typography>
                <ul>
                   <li><Typography>Can Checkout: {checkout}</Typography></li>
                   <li><Typography>Can Create: {create}</Typography></li>
                   <li><Typography>Can Delete: {del}</Typography></li>
                   <li><Typography>Can Edit Config: {config}</Typography></li>
                </ul>
            </Paper>
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

        const { projectInfo, onReset, isLoggedIn, onLogout } = this.props
        const { validationErrors } = this.state
        const { name, description, projectFilePath, remote, permissions } = projectInfo
        const disabled = remote

        return (
            <div id="GeneralSettings">
                <Typography variant="h4">Project Metadata</Typography>
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
                { remote && this.renderPermissions(permissions) }
                <div className="actions">
                    <Button className="action" variant="contained" disabled={disabled} onClick={onReset}>Reset Config</Button>
                </div>
                <div className="info">
                    <Typography variant="subtitle2">File Location: {projectFilePath}</Typography>
                </div>
                { isLoggedIn() && <Button className="action" variant="contained" onClick={onLogout}>Log Out</Button> }
            </div>
        )
    }
}

function yesOrNo( bool ) {
    return bool ? 'Y' : 'N'
}