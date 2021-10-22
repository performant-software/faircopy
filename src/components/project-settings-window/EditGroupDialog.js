import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@material-ui/core'

import { addGroupToMenu } from '../../model/faircopy-config'

export default class EditGroupDialog extends Component {

    constructor(props) {
        super(props)

        const { fairCopyConfig, menuID, groupIndex } = this.props
        const name = groupIndex !== -1 ? fairCopyConfig.menus[menuID][groupIndex].label : ''
        this.initialState = {
            name,
            validationErrors: {}
        }
        this.state = this.initialState
    }

    render() {      
        const { onClose, groupIndex } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            nextState[name] = value
            this.setState(nextState)
        }

        const onKeyUp = (e) => {
            if( e.keyCode === 13 ) onSaveInfo()
        }
        
        const onSaveInfo = () => {
            const { fairCopyConfig, onUpdateConfig, menuID } = this.props
    
            const { name } = this.state

            const nextErrors = {}
            const trimmedName = name.trim()
            if( trimmedName.length === 0 ) nextErrors['name'] = "Name cannot be blank."

            const hasErrors = Object.keys(nextErrors).length > 0
            if( hasErrors ) {
                this.setState({ ...this.state, validationErrors: nextErrors })
            } else {
                if( groupIndex === -1 ) {
                    addGroupToMenu(trimmedName, menuID, fairCopyConfig)
                } else {
                    fairCopyConfig.menus[menuID][groupIndex].label = trimmedName
                }
                onUpdateConfig(fairCopyConfig)
                this.setState(this.initialState)
                onClose()
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const { name, validationErrors } = this.state
        const title = groupIndex === -1 ? "Add Group" : "Edit Group"

        return (
            <Dialog
                id="EditGroupDialog"
                open={true}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">{title}</DialogTitle>
                <DialogContent>
                    <TextField 
                        name="name"
                        className="name-field"
                        value={name}
                        onChange={onChange}
                        error={validationErrors['name'] !== undefined }
                        helperText={validationErrors['name']}
                        label="Group Name" 
                        onKeyUp={onKeyUp}
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
