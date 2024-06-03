import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

export default class EditSurfaceInfoDialog extends Component {

    constructor(props) {
        super(props)
        const { surfaceInfo } = this.props
        this.initialState = { ...surfaceInfo, validationErrors: {} }
        this.state = this.initialState
    }

    render() {      
        const { editDialogMode, onSave, onClose } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSaveInfo = () => {
            const { name, resourceID, surfaceID } = this.state

            const nextErrors = {}
            const trimmedName = name.trim()
            if( trimmedName.length === 0 ) nextErrors['name'] = "Name cannot be blank."

            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                this.setState(this.initialState)
                onSave({ resourceID, surfaceID, name: trimmedName})    
            }
        }

        const onKeyUp = (e) => {
            if( e.keyCode === 13 ) onSaveInfo()
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const { name, validationErrors } = this.state

        return (
            <Dialog
                id="EditResourceDialog"
                open={editDialogMode !== false}
                onClose={onClickClose}
                aria-labelledby="edit-surface-title"
            >
                <DialogTitle id="edit-surface-title">Edit Surface</DialogTitle>
                <DialogContent>
                    <TextField 
                        name="name"
                        autoFocus={true}
                        className="name-field"
                        value={name}
                        onChange={onChange}
                        error={validationErrors['name'] !== undefined }
                        helperText={validationErrors['name']}
                        label="Surface Name" 
                        onKeyUp={onKeyUp}
                    /><br/>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onSaveInfo}>Save</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
