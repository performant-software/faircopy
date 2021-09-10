import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Card, CardContent, Typography, Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Select } from '@material-ui/core'

import { idValidator } from '../../../model/attribute-validators'

export default class EditResourceDialog extends Component {

    constructor(props) {
        super()
        const { resourceEntry } = props
        this.initialState = resourceEntry ? { ...resourceEntry, validationErrors: {} } : {
            name: "",
            localID: "",
            type: "text",
            validationErrors: {}
        }
        this.state = this.initialState
    }

    renderTypeCard(title, icon, description) {
        return(
            <Card className="resource-type-card" variant="outlined">
                <CardContent >
                    <div className="type-icon">
                        <i className={`${icon} fa-3x`}></i>
                    </div>
                    <div className="description">
                        <Typography variant="h5">{title}</Typography>
                        <Typography variant="body2" color="textSecondary" component="p">
                           {description}
                        </Typography>
                    </div>
                </CardContent>
            </Card>
        )
    }

    renderResourceTypeSelect(type,onChange) {
        const { parentEntry } = this.props

        return (
            <div>
                <Typography color="textSecondary" >Resource Type</Typography>
                <Select
                    name="type"
                    value={type}
                    onChange={onChange}
                    variant="outlined"
                >
                    <MenuItem value={'text'}>
                        { this.renderTypeCard("Text","fa fa-book",
                            <span>A single text of any kind. <br/>For example: a poem or drama, <br/>a collection of essays, <br/>a novel, or a bibliography.</span>
                        )}
                    </MenuItem>
                    <MenuItem value={'facs'}>
                        { this.renderTypeCard("Facsimile","fa fa-images",
                            <span>A facsimile is a collection of <br/>images of a physical text. The <br/>images are sequenced in reading <br/>order or the order in which <br/>they are archived.</span>
                        )}
                    </MenuItem>
                    <MenuItem value={'standOff'}>
                        { this.renderTypeCard("Stand Off","fa fa-bullseye-pointer",
                            <span>A container for linked data, <br/>contextual information, and <br/>stand-off annotations.</span>
                        )}
                    </MenuItem>
                    { !parentEntry && <MenuItem value={'teidoc'}>
                        { this.renderTypeCard("TEI Document","fa fa-books",
                            <span>A group of texts and facsimiles <br/>which share a common metadata <br/>description or a single text or <br/>facsimile which requires detailed <br/>metadata.</span>
                        )}
                    </MenuItem> }
                </Select><br/>
            </div>
        )
    }

    render() {      
        const { editDialogMode, onSave, onClose, resourceEntry } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSaveResource = () => {
            const { resourceEntry, parentEntry, idMap } = this.props
            const { name, type, localID } = this.state

            const nextErrors = {}
            const trimmedName = name.trim()
            if( trimmedName.length === 0 ) nextErrors['name'] = "Name cannot be blank."

            if( !resourceEntry || localID !== resourceEntry.localID ) {
                if( localID.length === 0 ) nextErrors['localID'] = "ID cannot be blank."
                else {
                    if( !idMap.isUnique(localID, parentEntry?.localID ) ) {
                        nextErrors['localID'] = parentEntry ? "ID is already in use in this TEI Document." : "ID is already in use in this project."
                    } else {
                        const idValid = idValidator(localID)
                        if( idValid.error ) nextErrors['localID'] = idValid.errorMessage        
                    }
                }    
            }

            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                this.setState(this.initialState)
                const actualType = type === 'facs-iiif' ? 'facs' : type
                onSave(trimmedName,localID,actualType)    
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const dialogTitle = resourceEntry ? "Edit Resource" : "Create Resource"

        const { name, type, localID, validationErrors } = this.state

        return (
            <Dialog
                id="EditResourceDialog"
                open={editDialogMode !== false}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">{dialogTitle}</DialogTitle>
                <DialogContent>
                    <TextField 
                        name="name"
                        className="name-field"
                        value={name}
                        onChange={onChange}
                        error={validationErrors['name'] !== undefined }
                        helperText={validationErrors['name']}
                        label="Resource Name" 
                    /><br/>
                    <TextField 
                        name="localID"
                        className="name-field"
                        value={localID}
                        onChange={onChange}
                        error={validationErrors['localID'] !== undefined }
                        helperText={validationErrors['localID']}
                        label="ID" 
                    /><br/>
                    { !resourceEntry && this.renderResourceTypeSelect(type,onChange) }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onSaveResource} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
