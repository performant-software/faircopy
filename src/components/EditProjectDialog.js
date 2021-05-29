import React, { Component } from 'react'

import { Button, Typography } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

import { exportConfig } from '../tei-document/faircopy-config'

export default class EditProjectDialog extends Component {

    constructor(props) {
        super(props)

        const { projectInfo } = this.props
        this.initialState = projectInfo ? { ...projectInfo, validationErrors: {} } : {
            name: "",
            description: "",
            projectFilePath: "",
            validationErrors: {}
        }
        this.state = this.initialState
    }

    render() {      
        const { editDialogMode, onSave, onClose, onReset } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSaveInfo = () => {
            const { name, description } = this.state

            const nextErrors = {}
            const trimmedName = name.trim()
            if( trimmedName.length === 0 ) nextErrors['name'] = "Name cannot be blank."

            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                this.setState(this.initialState)
                onSave(trimmedName,description)    
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const onExportConfig = () => {
            const { projectConfig } = this.props
            const exportPath = 'temp/project-config-export.json'
            exportConfig(exportPath,projectConfig)
        }

        const { name, description, projectFilePath, validationErrors } = this.state

        return (
            <Dialog
                id="EditResourceDialog"
                open={editDialogMode !== false}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Edit Project Information</DialogTitle>
                <DialogContent>
                    <TextField 
                        name="name"
                        className="name-field"
                        value={name}
                        onChange={onChange}
                        error={validationErrors['name'] !== undefined }
                        helperText={validationErrors['name']}
                        label="Project Name" 
                    /><br/>
                    <TextField 
                        name="description"
                        className="name-field"
                        value={description}
                        onChange={onChange}
                        label="Project Description" 
                    /><br/>
                    <Button variant="contained" onClick={onExportConfig}>Export Project Config</Button>
                    <Button variant="contained" onClick={onReset}>Reset to Default</Button>
                    <Typography variant="subtitle2">File Location: {projectFilePath}</Typography>

                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onSaveInfo} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
