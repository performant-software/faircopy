import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, MenuItem, Select } from '@material-ui/core'

export default class EditResourceDialog extends Component {

    constructor() {
        super()
        this.initialState = {
            name: "",
            resourceType: "text",
            url: "https://iiif.harvardartmuseums.org/manifests/object/299843"
        }
        this.state = this.initialState
    }

    render() {      
        const { editDialogMode, onSave, onClose } = this.props
        
        const onChange = (e) => {
            const {name, value} = e.target
            const nextState = { ...this.state }
            if( name === 'resourceType' && value === 'text' ) {
                nextState['url'] = ''
            }
            nextState[name] = value
            this.setState(nextState)
        }

        const onSaveResource = () => {
            const { name, resourceType, url } = this.state
            if( name.length > 0 ) {
                this.setState(this.initialState)
                onSave(name,resourceType,url)
            }
        }

        const onClickClose = () => {
            this.setState(this.initialState)
            onClose()
        }

        const { name, resourceType, url } = this.state

        return (
            <Dialog
                id="EditResourceDialog"
                open={editDialogMode !== false}
                onClose={onClickClose}
                aria-labelledby="edit-resource-title"
                aria-describedby="edit-resource-description"
            >
                <DialogTitle id="edit-resource-title">Create Resource</DialogTitle>
                <DialogContent>
                    <TextField 
                        name="name"
                        className="name-field"
                        value={name}
                        onChange={onChange}
                        label="Resource Name" 
                    /><br/>
                    <Select
                        name="resourceType"
                        value={resourceType}
                        onChange={onChange}
                    >
                        <MenuItem value={'text'}>Text</MenuItem>
                        {/* <MenuItem value={'facs'}>Facsimile</MenuItem> */}
                    </Select>
                    {/* <TextField 
                        disabled={resourceType !== 'facs'}
                        name="url"
                        className="name-field"
                        value={url}
                        onChange={onChange}
                        label="IIIF Manigest URL" 
                    /> */}
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" color="primary" onClick={onSaveResource} autoFocus>Save</Button>
                    <Button variant="outlined" onClick={onClickClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        )
    }

}
