import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Select } from '@material-ui/core'

import { idValidator, validateURL } from '../tei-document/attribute-validators'

export default class EditResourceDialog extends Component {

    constructor(props) {
        super()
        const { resourceEntry } = props
        this.initialState = resourceEntry ? { ...resourceEntry, validationErrors: {} } : {
            name: "",
            localID: "",
            type: "text",
            url: "",
            validationErrors: {}
        }
        this.state = this.initialState
    }

    render() {      
        const { editDialogMode, onSave, onClose, resourceEntry } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            if( name === 'type' && value === 'text' ) {
                nextState['url'] = ''
            }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSaveResource = () => {
            const { resourceEntry, idMap } = this.props
            const { name, type, localID, url } = this.state

            const nextErrors = {}
            const trimmedName = name.trim()
            if( trimmedName.length === 0 ) nextErrors['name'] = "Name cannot be blank."

            if( !resourceEntry || localID !== resourceEntry.localID ) {
                if( localID.length === 0 ) nextErrors['localID'] = "ID cannot be blank."
                else {
                    if( !idMap.isUnique(localID) ) {
                        nextErrors['localID'] = "ID is already in use in this project."
                    } else {
                        const idValid = idValidator(localID)
                        if( idValid.error ) nextErrors['localID'] = idValid.errorMessage        
                    }
                }    
            }

            if( !resourceEntry && type === 'facs-iiif') { 
                const validURL = validateURL(url)
                if( validURL.error ) nextErrors['url'] = validURL.errorMessage
            }
            
            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                this.setState(this.initialState)
                const actualType = type === 'facs-iiif' ? 'facs' : type
                onSave(trimmedName,localID,actualType,url)    
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const dialogTitle = resourceEntry ? "Edit Resource" : "Create Resource"

        const { name, type, localID, url, validationErrors } = this.state

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
                    { !resourceEntry && <span><Select
                        name="type"
                        value={type}
                        onChange={onChange}
                    >
                        <MenuItem value={'text'}>Text</MenuItem>
                        <MenuItem value={'facs'}>Facsimile</MenuItem>
                        <MenuItem value={'facs-iiif'}>Facsimile from IIIF Manifest</MenuItem>
                    </Select><br/></span>}
                    { type === 'facs-iiif' && <TextField 
                        name="url"
                        className="name-field"
                        value={url}
                        onChange={onChange}
                        error={validationErrors['url'] !== undefined }
                        helperText={validationErrors['url']}
                        label="IIIF Manifest URL" 
                    /> }
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onSaveResource} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
