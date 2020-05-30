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
        
        const onChangeName = (e) => {
            const name = e.currentTarget.value
            this.setState( { ...this.state, name })
        }

        const onSaveResource = () => {
            const { name } = this.state
            if( name.length > 0 ) {
                onSave(this.state.name,"text")
            }
        }

        const { name } = this.state

        return (
            <Dialog
                id="EditResourceDialog"
                open={editDialogMode !== false}
                onClose={onClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Create Resource</DialogTitle>
                <DialogContent>
                    <TextField 
                        className="name-field"
                        value={name}
                        onChange={onChangeName}
                        label="Resource Name" 
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={onSaveResource} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
