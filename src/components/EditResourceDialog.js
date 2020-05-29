import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

export default class EditResourceDialog extends Component {

    constructor() {
        super()
        this.state = {
            name: ""
        }
    }

    render() {      
        const { editDialogMode, onSave, onClose } = this.props
        const { name } = this.state
        
        const onChangeName = () => {
            // TODO
        }
        
        return (
            <Dialog
                open={editDialogMode !== false}
                onClose={onClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Create Resource</DialogTitle>
                <DialogContent>
                    <TextField 
                        value={name}
                        onChange={onChangeName}
                        label="Resource Name" 
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={onSave} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
