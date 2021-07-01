import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

export default class EditGroupNameDialog extends Component {

    constructor(props) {
        super(props)

        const { fairCopyConfig, menuID, groupIndex } = this.props
        const name = fairCopyConfig.menus[menuID][groupIndex].label
        this.initialState = {
            name,
            validationErrors: {}
        }
        this.state = this.initialState
    }

    render() {      
        const { onClose } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSaveInfo = () => {
            const { fairCopyConfig, onUpdateConfig, menuID, groupIndex } = this.props
    
            const { name } = this.state

            const nextErrors = {}
            const trimmedName = name.trim()
            if( trimmedName.length === 0 ) nextErrors['name'] = "Name cannot be blank."

            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                fairCopyConfig.menus[menuID][groupIndex].label = name
                onUpdateConfig(fairCopyConfig)
                this.setState(this.initialState)
                onClose(trimmedName)    
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const { name, validationErrors } = this.state

        return (
            <Dialog
                id="EditGroupNameDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Edit Group Name</DialogTitle>
                <DialogContent>
                    <TextField 
                        name="name"
                        className="name-field"
                        value={name}
                        onChange={onChange}
                        error={validationErrors['name'] !== undefined }
                        helperText={validationErrors['name']}
                        label="Group Name" 
                    /><br/>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onSaveInfo} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
